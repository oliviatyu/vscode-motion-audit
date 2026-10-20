import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile, rename } from 'node:fs/promises';
import { tmpdir, arch, cpus, loadavg } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BENCHMARK_VERSION, CdpClient, delay, extractFixtures, extractLightOnlyFixtures, summarizePairs, cpuAssessment, requiresBrowserRestart, canResumeRun, isReusableResult } from './library-performance-utils.mjs';
import { installAnimationIsolation } from './library-animation-isolation.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const origin = process.env.BENCHMARK_ORIGIN ?? 'http://localhost:4180';
const chromePath = process.env.BENCHMARK_CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const isolateAnimations = process.env.BENCHMARK_ISOLATE === '1';
const outputPath = process.env.BENCHMARK_OUTPUT ?? join(root, 'assets', isolateAnimations ? 'library-animation-performance.json' : 'library-performance.json');
const runs = Number(process.env.BENCHMARK_RUNS ?? 3);
const measurementSeconds = Number(process.env.BENCHMARK_SECONDS ?? 5);
if (!Number.isInteger(runs) || runs < 3 || !Number.isFinite(measurementSeconds) || measurementSeconds < 3) {
	throw new Error('Use at least three pairs and at least three seconds per condition.');
}
const librarySource = await readFile(join(root, 'app.js'), 'utf8');
const lightOnlyFixtures = extractLightOnlyFixtures(librarySource);
const fixtures = extractFixtures(librarySource)
	.filter(fixture => !process.env.BENCHMARK_FIXTURE || fixture === process.env.BENCHMARK_FIXTURE);
if (!fixtures.length) {
	throw new Error(`Unknown Library fixture: ${process.env.BENCHMARK_FIXTURE}`);
}
let profilePath;
let chrome;
let exited;
let spawnError;
let interrupted = false;
const interrupt = () => { interrupted = true; };
process.once('SIGINT', interrupt);
process.once('SIGTERM', interrupt);
let client;
let systemClient;

async function waitFor(check, description, timeout = 60000) {
	const started = performance.now();
	while (performance.now() - started < timeout) {
		if (interrupted) {
			throw new Error('Benchmark interrupted; completed measurements are preserved.');
		}
		const result = await check();
		if (result) {
			return result;
		}
		await delay(150);
	}
	throw new Error(`Timed out waiting for ${description}.`);
}

async function rendererCpuTime() {
	const { processInfo } = await systemClient.send('SystemInfo.getProcessInfo');
	const renderers = processInfo.filter(process => process.type === 'renderer');
	if (!renderers.length) {
		throw new Error('Chrome did not report renderer CPU.');
	}
	return renderers.reduce((total, process) => total + process.cpuTime, 0);
}

async function save(document) {
	await writeFile(`${outputPath}.tmp`, `${JSON.stringify(document, null, '\t')}\n`);
	await rename(`${outputPath}.tmp`, outputPath);
}

async function previousRun() {
	try {
		return JSON.parse(await readFile(outputPath, 'utf8'));
	} catch (error) {
		if (error.code !== 'ENOENT') {
			throw error;
		}
	}
}

// Runs in the parent frame, using the same interactive fixture host as Explorer.
function installHarness() {
	document.body.replaceChildren();
	document.body.style.cssText = 'margin:0;background:#181818;color:white';
	const frame = document.createElement('iframe');
	frame.style.cssText = 'border:0;width:1100px;height:980px;display:block';
	const probe = document.createElement('button');
	probe.textContent = 'Responsiveness probe';
	probe.style.cssText = 'position:fixed;z-index:2147483647;right:10px;bottom:10px;width:180px;height:40px';
	document.body.append(frame, probe);
	const harness = window.motionBenchmark = { frame, probe, ready: false, errors: [], input: { enableAnimations: false, overrideFocus: false } };
	window.addEventListener('message', event => {
		if (event.source !== frame.contentWindow || event.origin !== location.origin) {
			return;
		}
		const message = event.data;
		if (message.type === 'component-explorer:embedded-loaded') {
			frame.contentWindow.postMessage({
				type: 'component-explorer:embedded-init', input: harness.input,
				host: { kind: 'explorer-ui', interactive: true }
			}, location.origin);
		} else if (message.type === 'component-explorer:ready') {
			harness.ready = true;
		} else if (message.type === 'component-explorer:error' ||
			(message.type === 'component-explorer:console' && message.eventType !== 'console.warn' && message.eventType !== 'console.log')) {
			harness.errors.push(message.error?.message ?? message.message);
		}
	});
	probe.addEventListener('click', event => {
		const sample = harness.sample;
		if (!sample) {
			return;
		}
		sample.inputDelays.push(performance.now() - event.timeStamp);
		probe.style.outline = sample.inputDelays.length % 2 ? '1px solid white' : 'none';
		requestAnimationFrame(() => sample.clickFrames.push(performance.now() - event.timeStamp));
	});
	harness.fixture = () => {
		const fixtures = frame.contentDocument?.querySelectorAll('.component-fixture-container');
		if (fixtures?.length !== 1 || !fixtures[0].classList.contains(harness.theme === 'Light' ? 'vs' : 'vs-dark')) {
			throw new Error(`Expected exactly one ${harness.theme} fixture.`);
		}
		return fixtures[0];
	};
	harness.setMotion = enabled => {
		harness.input.enableAnimations = enabled;
		frame.contentWindow.postMessage({ type: 'component-explorer:embedded-input', input: { ...harness.input } }, location.origin);
	};
	harness.verifyMotion = async () => {
		const fixture = harness.fixture();
		let mutations = 0;
		let drawUpdates = 0;
		const observer = new MutationObserver(records => {
			mutations += records.length;
			drawUpdates += records.filter(record => record.attributeName === 'd' && record.target.matches('.chat-working-logo-draw-band')).length;
		});
		observer.observe(fixture, { subtree: true, attributes: true, childList: true, characterData: true });
		const animations = () => fixture.getAnimations({ subtree: true })
			.filter(animation => animation.playState === 'running' && animation.effect?.getComputedTiming().activeDuration > 0).length;
		const cssAnimations = animations();
		const text = fixture.innerText;
		await new Promise(resolve => setTimeout(resolve, 500));
		observer.disconnect();
		return {
			cssAnimations: Math.max(cssAnimations, animations()), mutations, drawUpdates,
			text, textChanged: text !== fixture.innerText,
			disabled: fixture.classList.contains('disable-animations'),
			visible: fixture.getBoundingClientRect().width > 0 && fixture.getBoundingClientRect().height > 0,
			logoCount: fixture.querySelectorAll('.chat-working-logo-draw').length
		};
	};
	harness.startSample = () => {
		const sample = harness.sample = { frames: [], inputDelays: [], clickFrames: [], longTasks: [], started: performance.now() };
		let previous;
		const nextFrame = now => {
			if (previous !== undefined) {
				sample.frames.push(now - previous);
			}
			previous = now;
			sample.frameId = requestAnimationFrame(nextFrame);
		};
		sample.frameId = requestAnimationFrame(nextFrame);
		sample.observer = new PerformanceObserver(list => sample.longTasks.push(...list.getEntries().map(entry => entry.duration)));
		sample.observer.observe({ type: 'longtask' });
	};
	harness.endSample = () => {
		const sample = harness.sample;
		cancelAnimationFrame(sample.frameId);
		sample.longTasks.push(...sample.observer.takeRecords().map(entry => entry.duration));
		sample.observer.disconnect();
		harness.sample = undefined;
		const percentile = (values, quantile) => {
			if (!values.length) {
				throw new Error('Insufficient frame or input samples.');
			}
			const sorted = [...values].sort((a, b) => a - b);
			return sorted[Math.ceil(sorted.length * quantile) - 1];
		};
		if (sample.inputDelays.length < 3 || sample.frames.length < 30) {
			throw new Error(`Insufficient samples: ${sample.frames.length} frames, ${sample.inputDelays.length} clicks, ${sample.clickFrames.length} click frames; visibility ${document.visibilityState}.`);
		}
		return {
			elapsedSeconds: (performance.now() - sample.started) / 1000,
			frameP95Ms: percentile(sample.frames, 0.95),
			frameMedianMs: percentile(sample.frames, 0.5),
			framesOver50Ms: sample.frames.filter(value => value > 50).length,
			frameCount: sample.frames.length,
			inputDelayP95Ms: percentile(sample.inputDelays, 0.95),
			clickToFrameP95Ms: percentile(sample.clickFrames, 0.95),
			inputCount: sample.inputDelays.length,
			longTaskCount: sample.longTasks.length,
			longTaskTotalMs: sample.longTasks.reduce((sum, value) => sum + value, 0)
		};
	};
}

async function assertNoErrors() {
	const errors = await client.evaluate('window.motionBenchmark.errors');
	if (errors.length) {
		throw new Error(`Fixture error: ${errors.join('; ').slice(0, 1400)}`);
	}
}

async function measure(enabled) {
	await client.evaluate(`window.motionBenchmark.setMotion(${enabled})`);
	await delay(600);
	const verification = await client.evaluate('window.motionBenchmark.verifyMotion()');
	await assertNoErrors();
	if (!verification.visible || verification.disabled === enabled || verification.textChanged) {
		throw new Error('Fixture is hidden, the motion control did not apply, or content is changing; needs an action-specific test.');
	}

	if (!enabled && (verification.cssAnimations || verification.drawUpdates || verification.mutations)) {
		throw new Error('Motion-off control did not stop fixture updates; cannot isolate animation CPU.');
	}
	if (enabled && !verification.cssAnimations && !verification.drawUpdates) {
		throw new Error('No sustained CSS or Draw motion detected after readiness; needs an action-replay or custom JavaScript test.');
	}
	const beforeCpu = await rendererCpuTime();
	const started = performance.now();
	await client.evaluate('window.motionBenchmark.startSample()');
	while (performance.now() - started < measurementSeconds * 1000) {
		if (interrupted) {
			throw new Error('Benchmark interrupted.');
		}
		const point = await client.evaluate(`(() => {
			const bounds = window.motionBenchmark.probe.getBoundingClientRect();
			const x = bounds.left + bounds.width / 2, y = bounds.top + bounds.height / 2;
			if (document.elementFromPoint(x, y) !== window.motionBenchmark.probe) {
				throw new Error('Responsiveness probe is obscured.');
			}
			return { x, y };
		})()`);
		await client.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point, buttons: 0 });
		await client.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', buttons: 1, clickCount: 1 });
		await client.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', buttons: 0, clickCount: 1 });
		await delay(600);
	}
	const sample = await client.evaluate('window.motionBenchmark.endSample()');
	const elapsedSeconds = (performance.now() - started) / 1000;
	const afterCpu = await rendererCpuTime();
	await assertNoErrors();
	const finalState = await client.evaluate('window.motionBenchmark.verifyMotion()');
	if (finalState.text !== verification.text || finalState.textChanged ||
		(!enabled && (finalState.cssAnimations || finalState.mutations)) ||
		(enabled && !finalState.cssAnimations && !finalState.drawUpdates)) {
		throw new Error('Fixture changed state or motion did not persist for the full sample; needs action replay.');
	}
	return {
		...sample, elapsedSeconds,
		rendererCpuUtilization: (afterCpu - beforeCpu) / elapsedSeconds * 100,
		verification: {
			...verification, text: undefined,
			stateHash: createHash('sha256').update(verification.text).digest('hex')
		}
	};
}

async function profileJavaScript(enabled) {
	await client.evaluate(`window.motionBenchmark.setMotion(${enabled})`);
	await delay(600);
	await client.send('Profiler.enable');
	await client.send('Profiler.start');
	await delay(5000);
	const { profile } = await client.send('Profiler.stop');
	await client.send('Profiler.disable');
	if (!profile.samples?.length || profile.samples.length !== profile.timeDeltas?.length) {
		throw new Error('Chrome did not return a usable JavaScript profile.');
	}
	const nodes = new Map(profile.nodes.map(node => [node.id, node.callFrame]));
	const functions = new Map();
	profile.samples.forEach((id, index) => {
		const frame = nodes.get(id);
		if (!frame) {
			throw new Error(`Chrome profile referenced an unknown node: ${id}`);
		}
		const key = `${frame.functionName || '(anonymous)'} ${frame.url}`;
		const entry = functions.get(key) ?? { functionName: frame.functionName || '(anonymous)', url: frame.url, selfTimeMs: 0 };
		entry.selfTimeMs += profile.timeDeltas[index] / 1000;
		functions.set(key, entry);
	});
	await assertNoErrors();
	return {
		condition: enabled ? 'on' : 'off',
		scope: 'Separate five-second idle main-thread JS sample; profiler overhead included, not renderer/GPU CPU or input latency',
		functions: [...functions.values()].sort((a, b) => b.selfTimeMs - a.selfTimeMs).slice(0, 30),
		profile
	};
}

async function initializeBrowser() {
	profilePath = await mkdtemp(join(tmpdir(), 'motion-settled-benchmark-'));
	spawnError = undefined;
	chrome = spawn(chromePath, [
		'--headless=new', '--disable-background-networking', '--disable-renderer-backgrounding',
		'--disable-background-timer-throttling', '--disable-extensions', '--no-first-run',
		'--remote-debugging-port=0', `--user-data-dir=${profilePath}`, '--window-size=1200,1100', 'about:blank'
	], { stdio: 'ignore' });
	exited = new Promise(resolve => chrome.once('exit', resolve));
	chrome.once('error', error => { spawnError = error; });
	const portText = await waitFor(async () => {
		if (spawnError) {
			throw spawnError;
		}
		try {
			return await readFile(join(profilePath, 'DevToolsActivePort'), 'utf8');
		} catch (error) {
			if (error.code !== 'ENOENT') {
				throw error;
			}
		}
	}, 'Chrome debugging port', 15000);
	const port = portText.split('\n')[0];
	const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then(response => response.json());
	const browser = await fetch(`http://127.0.0.1:${port}/json/version`).then(response => response.json());
	const target = targets.find(candidate => candidate.type === 'page');
	client = new CdpClient(target.webSocketDebuggerUrl);
	systemClient = new CdpClient(browser.webSocketDebuggerUrl);
	const contexts = new Map();
	client.listeners.set('Runtime.executionContextCreated', ({ context }) => {
		if (context.auxData?.isDefault) {
			contexts.set(context.auxData.frameId, context.id);
		}
	});
	await client.send('Page.enable');
	await client.send('Runtime.enable');
	await client.send('Page.navigate', { url: `${origin}/reference.html` });
	await delay(500);
	const { frameTree } = await client.send('Page.getFrameTree');
	client.contextId = await waitFor(() => contexts.get(frameTree.frame.id), 'parent JavaScript context');
	await client.evaluate(`(${installHarness.toString()})()`);
	if (isolateAnimations) {
		await client.evaluate(`(${installAnimationIsolation.toString()})()`);
	}
	await client.send('Page.bringToFront');
	return client.send('Browser.getVersion');
}

async function closeBrowser() {
	client?.close();
	if (systemClient) {
		try {
			await systemClient.send('Browser.close', {}, 5000);
		} catch (error) {
			console.error(`Browser shutdown: ${error.message}`);
		}
		systemClient.close();
	}
	if (chrome?.exitCode === null && chrome.signalCode === null && !spawnError) {
		chrome.kill('SIGTERM');
		await exited;
	}
	if (profilePath) {
		await rm(profilePath, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
	}
	client = undefined;
	systemClient = undefined;
	chrome = undefined;
	profilePath = undefined;
}

try {
	const browserVersion = await initializeBrowser();
	const previous = await previousRun();
	const document = {
		benchmarkVersion: BENCHMARK_VERSION,
		measuredAt: new Date().toISOString(),
		inventory: {
			scope: process.env.BENCHMARK_FIXTURE ? 'targeted' : 'full',
			status: 'running', requestedFixtures: fixtures, completedFixtures: 0
		},
		productValidation: previous?.productValidation,
		environment: {
			browser: browserVersion.product, userAgent: browserVersion.userAgent,
			platform: process.platform, architecture: arch(), logicalCpus: cpus().length,
			loadAverageAtStart: loadavg(), viewport: '1200x1100', headless: true
		},
		method: {
			metric: isolateAnimations ? 'Individual animation on/off with all other detected motion frozen' : 'Settled interactive fixture, paired motion on/off without reload',
			runs, measurementSecondsPerCondition: measurementSeconds,
			control: 'Explorer embedded-input enableAnimations; CSS and Draw motion verified on/off',
			startupExcluded: true,
			cpuScope: 'All renderer threads in a dedicated Chrome instance; excludes GPU process',
			responsiveness: 'Synthetic click dispatch to handler and next rAF; not real editor typing or physical display latency',
			frameScope: 'Parent requestAnimationFrame intervals; scheduling proxy, not compositor/presentation frames',
			cpuThresholds: { low: 'all paired deltas between -1 and 1 pp', moderate: 'all deltas >= 1 pp', high: 'all deltas >= 5 pp' },
			limitations: [
				`Exploratory ${runs}-pair screening, not statistical proof or product validation.`,
				'Same synthetic click probe in both conditions; shared-machine contention is not controlled.',
				'Only sustained CSS/Draw motion is supported. One-shot, changing-content and other JS states require dedicated action replay.',
				isolateAnimations
					? 'One animation instance per comparison; CSS/Web Animation timeline advancement and SVG mutations verify isolation. Uncontrolled updates invalidate attribution.'
					: 'Fixture costs may combine multiple motions or demonstration copies; no individual-animation attribution.'
			]
		},
		results: {}
	};
	if (process.env.BENCHMARK_RESUME === '1') {
		if (isolateAnimations) {
			throw new Error('Isolated animation runs do not reuse whole-fixture results; use a separate targeted output for repeats.');
		}
		if (!canResumeRun(previous, document)) {
			throw new Error('Cannot resume: requires the same version-2 method, sample settings, browser and platform.');
		}
		document.results = Object.fromEntries(fixtures.filter(fixture =>
			isReusableResult(previous.results?.[fixture], runs) &&
			(previous.results[fixture].theme ?? 'Dark') === (lightOnlyFixtures.has(fixture) ? 'Light' : 'Dark') &&
			(process.env.BENCHMARK_PROFILE !== '1' || previous.results[fixture].javascriptProfiles?.length === 2)
		).map(fixture => [fixture, previous.results[fixture]]));
		document.resume = { fromMeasuredAt: previous.measuredAt, reusedScreenedFixtures: Object.keys(document.results).length };
		document.inventory.completedFixtures = Object.keys(document.results).length;
	}
	await save(document);
	for (const [index, fixture] of fixtures.entries()) {
		if (interrupted) {
			break;
		}
		if (document.results[fixture]?.status === 'fixture-screened') {
			console.log(`${index + 1}/${fixtures.length} PRESERVED verified version-2 pairs ${fixture}`);
			continue;
		}
		console.log(`${index + 1}/${fixtures.length} TESTING ${fixture}`);
		const theme = lightOnlyFixtures.has(fixture) ? 'Light' : 'Dark';
		let restart = false;
		try {
			const url = new URL('/___explorer', origin);
			url.searchParams.set('fixture', `${fixture}/${theme}`);
			url.searchParams.set('mode', 'embedded');
			await client.evaluate(`(() => {
				const harness = window.motionBenchmark;
				harness.ready = false; harness.errors = []; harness.input.enableAnimations = false;
				harness.theme = ${JSON.stringify(theme)};
				harness.frame.src = ${JSON.stringify(url.href)};
			})()`);
			await waitFor(async () => {
				await assertNoErrors();
				return client.evaluate('window.motionBenchmark.ready');
			}, 'fixture render completion');
			await delay(2000);
			if (isolateAnimations) {
				const targets = await client.evaluate('window.motionBenchmark.discoverAnimations()');
				await assertNoErrors();
				const result = document.results[fixture] = {
					benchmarkVersion: BENCHMARK_VERSION, theme, measuredAt: new Date().toISOString(),
					scope: 'individual-animation', animations: [],
					reason: targets.length ? undefined : 'No independently controllable sustained animation; requires action replay or a dedicated JavaScript control.'
				};
				for (const target of targets) {
					try {
						await client.evaluate(`window.motionBenchmark.selectedAnimation = ${JSON.stringify(target.id)}`);
						const pairs = [];
						for (let run = 0; run < runs; run++) {
							const activeFirst = run % 2 === 0;
							const first = await measure(activeFirst);
							const second = await measure(!activeFirst);
							const active = activeFirst ? first : second;
							const baseline = activeFirst ? second : first;
							if (active.verification.stateHash !== baseline.verification.stateHash) {
								throw new Error('Animation treatment changed fixture content; cannot attribute CPU.');
							}
							pairs.push({ order: activeFirst ? 'on/off' : 'off/on', active, baseline });
						}
						const cpu = summarizePairs(pairs, 'rendererCpuUtilization');
						const rating = cpuAssessment(cpu);
						result.animations.push({
							...target, benchmarkVersion: BENCHMARK_VERSION, status: 'animation-screened',
							scope: 'individual-animation', measuredAt: new Date().toISOString(), cpu, rating, pairs
						});
						console.log(`  ${target.name}: ${rating} CPU ${cpu.delta.toFixed(2)} pp`);
					} catch (error) {
						result.animations.push({ ...target, unverified: true, reason: error.message });
						console.error(`  ${target.name}: ${error.message}`);
						if (requiresBrowserRestart(error)) {
							restart = true;
							result.reason = 'Renderer failed; remaining animation instances have no reliable measurement.';
							break;
						}
					}
					await save(document);
				}
				document.inventory.completedFixtures = Object.keys(document.results).length;
				await save(document);
				if (restart && !interrupted) {
					await closeBrowser();
					const restartedVersion = await initializeBrowser();
					if (restartedVersion.product !== browserVersion.product) {
						throw new Error('Chrome changed version during the run.');
					}
				}
				continue;
			}
			const pairs = [];
			for (let run = 0; run < runs; run++) {
				const activeFirst = run % 2 === 0;
				const first = await measure(activeFirst);
				const second = await measure(!activeFirst);
				const active = activeFirst ? first : second;
				const baseline = activeFirst ? second : first;
				if (active.verification.stateHash !== baseline.verification.stateHash) {
					throw new Error('Motion controls changed content; not a matched comparison.');
				}
				pairs.push({ order: activeFirst ? 'on/off' : 'off/on', active, baseline });
			}
			const cpu = summarizePairs(pairs, 'rendererCpuUtilization');
			const input = summarizePairs(pairs, 'inputDelayP95Ms');
			const clickFrame = summarizePairs(pairs, 'clickToFrameP95Ms');
			const frames = summarizePairs(pairs, 'frameP95Ms');
			const rating = cpuAssessment(cpu);
			const responsivenessCandidate = input.range[0] >= 16 || clickFrame.range[0] >= 16;
			const frameCandidate = frames.range[0] >= 8;
			document.results[fixture] = {
				benchmarkVersion: BENCHMARK_VERSION, theme, measuredAt: new Date().toISOString(),
				status: 'fixture-screened', rating, incrementalRendererCpuUtilization: cpu.delta,
				cpu, input, clickFrame, frames, pairs,
				candidate: rating === 'High' || rating === 'Moderate' || responsivenessCandidate || frameCandidate,
				responsivenessCandidate, frameCandidate,
				productValidation: { status: 'not-tested', slowdownProven: false }
			};
			if (process.env.BENCHMARK_PROFILE === '1') {
				document.results[fixture].javascriptProfiles = [
					await profileJavaScript(true), await profileJavaScript(false)
				];
			}
			console.log(`  ${rating}: CPU ${cpu.delta.toFixed(2)} pp [${cpu.range.map(value => value.toFixed(2)).join(', ')}]; click-to-frame delta ${clickFrame.delta.toFixed(1)} ms`);
		} catch (error) {
			document.results[fixture] = {
				benchmarkVersion: BENCHMARK_VERSION, theme, measuredAt: new Date().toISOString(),
				unverified: true, reason: error.message,
				productValidation: { status: 'not-tested', slowdownProven: false }
			};
			console.error(`  UNVERIFIED: ${error.message}`);
			restart = requiresBrowserRestart(error);
		}
		document.inventory.completedFixtures = Object.keys(document.results).length;
		await save(document);
		if (restart && !interrupted) {
			console.error('Restarting the dedicated browser so a failed renderer cannot invalidate later fixtures.');
			await closeBrowser();
			const restartedVersion = await initializeBrowser();
			if (restartedVersion.product !== browserVersion.product) {
				throw new Error('Chrome changed version during the run; refusing to mix environments.');
			}
		}
	}
	document.inventory.status = interrupted ? 'interrupted' : 'complete';
	document.inventory.completedFixtures = Object.keys(document.results).length;
	document.completedAt = new Date().toISOString();
	await save(document);
	if (interrupted) {
		process.exitCode = 130;
	}
} finally {
	await closeBrowser();
	process.removeListener('SIGINT', interrupt);
	process.removeListener('SIGTERM', interrupt);
}
