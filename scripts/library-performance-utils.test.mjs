import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { median, summarizePairs, cpuAssessment, extractFixtures, extractLightOnlyFixtures, requiresBrowserRestart, canResumeRun, isReusableResult } from './library-performance-utils.mjs';

test('Components includes animated icons and redirects legacy icon links', async () => {
	const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
	const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
	assert.match(html, /<h2 id="properties-title">Components<\/h2>/);
	assert.match(html, /<h2 id="transitions-title">Transitions<\/h2>/);
	assert.doesNotMatch(html, /data-view="animation"/);
	assert.match(html, /<details[^>]*id="animation-view"/);
	assert.equal((html.match(/data-view-panel="properties"/g) || []).length, 1);
	for (const id of ['icon-guidance', 'icon-rules', 'icon-components', 'icon-technical']) {
		assert.ok(html.includes(`id="${id}"`), `Retain ${id}`);
	}
	const panels = [{ dataset: { viewPanel: 'properties' } }, { dataset: { viewPanel: 'transitions' } }];
	const nodes = new Map();
	const node = id => {
		if (!nodes.has(id)) nodes.set(id, { classList: { toggle() {} }, focus() {}, scrollIntoView() { this.scrolled = true; } });
		return nodes.get(id);
	};
	let updatedView;
	const context = {
		phaseViews: { 2: ['properties', 'transitions'] }, currentView: 'properties', lastPhaseViews: {},
		elements: { viewPanels: panels, navItems: [] },
		document: { querySelectorAll: () => [], querySelector: node, getElementById: node },
		updateNavigationParameter: (_, view) => { updatedView = view; },
		window: { scrollTo() {} }, console
	};
	for (const panel of panels) {
		panel.classList = { toggle() {} };
		panel.querySelectorAll = () => [];
	}
	vm.runInNewContext(`${source.slice(source.indexOf('function switchView(view)'), source.indexOf('function renderLibrary(category)'))}; switchView('animation');`, context);
	assert.equal(updatedView, 'properties');
	assert.deepEqual(panels.map(panel => panel.hidden), [false, true]);
	assert.equal(node('animation-view').open, true);
	assert.equal(node('animation-view').scrolled, true);
});

test('Components keeps decision, requirements and verified timing without a duplicate pattern table', async () => {
	const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
	const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
	const page = html.slice(html.indexOf('id="properties-view"'), html.indexOf('id="transitions-view"'));
	assert.equal((page.match(/class="motion-guide-nav"/g) || []).length, 1);
	assert.equal((page.match(/class="guideline-notice"/g) || []).length, 0);
	assert.doesNotMatch(page, /Choose a pattern|component-roles|properties-body|Shared guidelines/);
	assert.doesNotMatch(source, /proposedComponentMotionGuidelines|renderProperties/);
	assert.ok(page.indexOf('id="when-to-use-motion"') < page.indexOf('id="component-rules"'));
	assert.match(page, /<span id="icon-rules">Motion requirements<\/span>/);
	assert.doesNotMatch(page, /<h3[^>]*>Principles<\/h3>/);
	assert.match(page, /<summary>Icon-specific timing and implementation<\/summary>/);
	assert.doesNotMatch(page, /component-patterns-frame|component-visual-examples/);
	assert.doesNotMatch(page, /<summary>Role-based timing and constraints<\/summary>/);
	assert.equal((page.match(/<summary>Supporting evidence<\/summary>/g) || []).length, 1);
	assert.doesNotMatch(page, /Icon role rationale|Comparison and implementation checklist/);
	assert.match(page, /<strong>Respond immediately to input:<\/strong> Confirm the action with a clear state change\. Add motion only when it makes the feedback easier to understand\./);
	const requirements = page.slice(page.indexOf('id="component-rules"'), page.indexOf('id="animation-view"'));
	assert.match(requirements, /Show when input is needed/);
	assert.match(requirements, /Stop active-work motion when a user response is required/);
	assert.match(requirements, /stable icon, a clear label such as "Input needed", and the available action/);
	assert.match(requirements, /Do not loop while waiting/);
	assert.match(requirements, /Budget CPU as well as attention/);
	assert.match(requirements, /Preserve meaning without motion/);
	assert.doesNotMatch(page.slice(page.indexOf('id="icon-technical"'), page.indexOf('id="component-evidence"')), /<th scope="row">Attention needed/);
});

test('Transitions separates design principles from adjacent operational motion requirements', async () => {
	const [html, source] = await Promise.all([
		readFile(new URL('../index.html', import.meta.url), 'utf8'),
		readFile(new URL('../app.js', import.meta.url), 'utf8')
	]);
	const page = html.slice(html.indexOf('id="transitions-view"'), html.indexOf('id="accessibility-view"'));
	assert.match(page, /<h3 id="transition-principles-title">Principles<\/h3>/);
	assert.match(page, /<h3 id="transition-shared-title">Motion requirements<\/h3>/);
	const requirements = page.slice(page.indexOf('id="transition-shared"'), page.indexOf('id="transition-choices"'));
	assert.match(requirements, /<ul class="motion-guide-rules" id="transition-shared-values"><\/ul>/);
	assert.doesNotMatch(requirements, /transition-technical-grid|<dl/);
	assert.match(page, /<section class="motion-guide-section" id="transition-shared"/);
	assert.doesNotMatch(page, /Shared guidelines/);
	assert.deepEqual([...page.matchAll(/<section[^>]* id="([^"]+)"/g)].map(match => match[1]), [
		'transition-principles', 'transition-shared', 'transition-choices'
	]);
	const navigation = page.slice(page.indexOf('<nav'), page.indexOf('</nav>'));
	assert.deepEqual([...navigation.matchAll(/href="#([^"]+)"/g)].map(match => match[1]), [
		'transition-principles', 'transition-shared', 'transition-choices', 'transition-evidence'
	]);
	const principles = page.slice(page.indexOf('id="transition-principles"'), page.indexOf('id="transition-shared"'));
	assert.match(principles, /Keep the surrounding editor stable/);
	assert.match(principles, /Preserve selection and reading position/);
	assert.doesNotMatch(principles, /Let new input interrupt|when motion is off|Reduced Motion/);
	for (const label of ['Playback', 'Interruption', 'Reduced Motion']) {
		assert.ok(source.includes(`<li><strong>${label}:</strong>`), `Retain operational rule: ${label}`);
	}
	assert.match(source, /Cancel the current run for new input\. Never queue actions/);
	assert.match(source, /Follow each pattern's focus rules/);
});

test('numbered principles and bulleted requirements share the same explicit indentation', async () => {
	const styles = await readFile(new URL('../styles.css', import.meta.url), 'utf8');
	assert.match(styles, /\.motion-guide-principles,\s*\.motion-guide-rules\s*\{\s*padding-left: 24px;\s*\}/);
});

test('Functional motion keeps its eight focusable row references after removing the duplicate table', async () => {
	const reference = await readFile(new URL('../assets/motion-patterns/index.html', import.meta.url), 'utf8');
	const ids = [...reference.matchAll(/id="(pattern-[a-z-]+)" tabindex="-1"/g)].map(match => match[1]);
	assert.equal(ids.length, 8);
	assert.equal(new Set(ids).size, 8);
	assert.match(reference, /#functional tr\[id\]:focus/);
	assert.match(reference, /<h1 id="functional-title">Functional motion<\/h1>/);
	assert.match(reference, /<th scope="row">Confetti<\/th>/);
});

test('navigation parameters can clear an example target without changing the selected view', async () => {
	const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
	const location = { href: 'https://example.test/motion-audit/?view=library&motionPattern=pattern-dictation' };
	const context = {
		URL,
		window: { location, history: { replaceState: (_, __, url) => { location.href = String(url); } } }
	};
	vm.runInNewContext(source.slice(source.indexOf('function updateNavigationParameter('), source.indexOf('function initializeOpportunityCarousels()')), context);
	context.updateNavigationParameter('motionPattern', null);
	assert.equal(new URL(location.href).searchParams.has('motionPattern'), false);
	assert.equal(new URL(location.href).searchParams.get('view'), 'library');
	context.updateNavigationParameter('view', 'properties');
	assert.equal(new URL(location.href).searchParams.get('view'), 'properties');
});

test('component timing guidance retains verified mechanisms rather than a universal cycle', async () => {
	const [html, raw, server] = await Promise.all([
		readFile(new URL('../index.html', import.meta.url), 'utf8'),
		readFile(new URL('../assets/component-timing-verification.json', import.meta.url), 'utf8'),
		readFile(new URL('../server.py', import.meta.url), 'utf8')
	]);
	const evidence = JSON.parse(raw);
	const technical = html.slice(html.indexOf('id="icon-technical"'), html.indexOf('id="component-evidence"'));
	for (const [family, duration, easing] of [
		['Rotating Codicon', '1,500', 'steps(30)'],
		['PixelSpinner grid', '1,820', 'steps(6, jump-none)'],
		['PixelSpinner ring', '1,200', 'steps(4, jump-none)'],
		['Multi-stage working logo', '2,667', 'JavaScript-driven']
	]) {
		const row = technical.split('<tr>').find(row => row.includes(`<th scope="row">${family}</th>`));
		assert.ok(row, `Timing row for ${family}`);
		assert.ok(row.includes(`${duration} ms / cycle`));
		assert.ok(row.includes(easing));
	}
	assert.doesNotMatch(technical, /Proposed shared baseline|Test 1,500 ms/);
	const cases = new Map(evidence.cases.map(item => [item.name || item.fixture, item]));
	for (const [variant, duration] of [['grid', 1820], ['ring', 1200]]) {
		const comparison = cases.get(`PixelSpinner ${variant}`);
		assert.equal(comparison.original.length, 6);
		assert.ok(comparison.original.every(dot => dot.duration === duration));
		assert.deepEqual(comparison.restored, comparison.original);
		assert.ok(comparison.durationOnly.some((dot, i) => Math.abs(dot.relativeDelay - comparison.original[i].relativeDelay) > 0.01));
		assert.ok(comparison.scaledDurationAndDelay.every((dot, i) => Math.abs(dot.relativeDelay - comparison.original[i].relativeDelay) < 1e-8));
		assert.equal(comparison.browserReducedMotion.running, 0);
		assert.ok(comparison.browserReducedMotion.dots.every(opacity => opacity === '1'));
		assert.equal(comparison.cleanLifecycle.offscreenClassApplied, true);
		assert.ok(comparison.cleanLifecycle.hiddenStates.every(state => state === (variant === 'grid' ? 'paused' : 'running')));
	}
	const phaseGaps = dots => {
		const delays = dots.map(dot => dot.delay).sort((a, b) => a - b);
		return delays.map((value, i) => (delays[i + 1] ?? delays[0] + dots[0].duration) - value);
	};
	assert.deepEqual(phaseGaps(cases.get('PixelSpinner ring').original), [200, 200, 200, 200, 200, 200]);
	assert.deepEqual(phaseGaps(cases.get('PixelSpinner ring').durationOnly), [200, 200, 200, 200, 200, 500]);
	const codicons = cases.get('sessions/createPullRequest/Loading').baseline.animations.filter(animation => animation.name === 'codicon-spin');
	assert.equal(codicons.length, 2);
	assert.ok(codicons.every(animation => animation.duration === 1500 && animation.cssTimingFunction === 'steps(30)'));
	const logo = cases.get('chat/logoMotion/chatWorkingLogo/Performance/Draw');
	assert.equal(logo.active.pathsChanged, true);
	assert.equal(logo.disabled.pathsStable, true);
	const countdown = cases.get('sessions/sessionsListNotification/BulkDoneNotificationAnimated');
	assert.equal(countdown.baseline.animations[0].duration, 10000);
	assert.equal(countdown.pause.paused.delta, 0);
	assert.equal(countdown.pause.resumed, true);
	const image = cases.get('chat/generatedImages/chatGeneratedImages/GlyphRevealFinal');
	assert.ok(image.reveal.revealDuration > 200);
	assert.equal((image.reveal.revealDuration / 1000).toFixed(1), '3.6');
	assert.equal(image.reveal.imageVisible, true);
	assert.equal(image.reducedFixture.revealing, false);
	assert.equal(image.reducedFixture.imageVisible, true);
	assert.ok(evidence.completedAt);
	assert.equal(evidence.sourceRoot, 'vscode-main (local source snapshot; no Git metadata)');
	assert.ok(Object.values(evidence.sourceHashes).every(hash => /^[a-f0-9]{64}$/.test(hash)));
	assert.match(html, /id="component-timing-review"/);
	assert.match(html, /href="\.\/assets\/component-timing-verification\.json"/);
	assert.ok(server.includes("'/assets/component-timing-verification.json'"));
});

test('medians validate samples and retain negative differences', () => {
	assert.equal(median([7, 1, 3]), 3);
	assert.equal(median([1, 3]), 2);
	assert.throws(() => median([]));
	assert.throws(() => median([NaN]));
	const summary = summarizePairs([
		{ active: { cpu: 2 }, baseline: { cpu: 4 } },
		{ active: { cpu: 3 }, baseline: { cpu: 4 } },
		{ active: { cpu: 8 }, baseline: { cpu: 4 } }
	], 'cpu');
	assert.deepEqual(summary, { active: 3, baseline: 4, delta: -1, range: [-2, 4] });
});

test('CPU labels require agreement across pairs, including exact thresholds', () => {
	assert.equal(cpuAssessment({ range: [5, 7] }), 'High');
	assert.equal(cpuAssessment({ range: [1, 5] }), 'Moderate');
	assert.equal(cpuAssessment({ range: [-0.9, 0.9] }), 'Low');
	assert.equal(cpuAssessment({ range: [-2, -1] }), 'Inconclusive');
	assert.equal(cpuAssessment({ range: [-1, 7] }), 'Inconclusive');
	assert.equal(cpuAssessment({ range: [0.5, 7] }), 'Inconclusive');
	assert.equal(cpuAssessment({ range: [4.035, 9.442] }), 'Moderate');
});

test('fixture extraction covers production and explorer without duplicates', () => {
	assert.deepEqual(extractFixtures(`const productionLibraryItems = [
	{ fixture: 'a' }, { fixture: 'b' }
].map(x => x);
const animatedComponentExplorerFixtures = [
	'a', 'c'
];`), ['a', 'b', 'c']);
	assert.throws(() => extractFixtures('invalid'));
});

test('unresponsive renderers trigger recovery, ordinary coverage gaps do not', () => {
	assert.equal(requiresBrowserRestart(new Error('Runtime.evaluate timed out after 30000 ms')), true);
	assert.equal(requiresBrowserRestart(new Error('Timed out waiting for fixture render completion')), true);
	assert.equal(requiresBrowserRestart(new Error('Insufficient samples: 25 frames, 1 clicks')), true);
	assert.equal(requiresBrowserRestart(new Error('No sustained CSS or Draw motion detected')), false);
});

test('resume requires matching version-2 method, browser, sample settings and verified raw controls', () => {
	const current = {
		benchmarkVersion: 2,
		method: { metric: 'settled', control: 'explicit', runs: 3, measurementSecondsPerCondition: 5 },
		environment: { browser: 'Chrome/155', platform: 'darwin', architecture: 'arm64' }
	};
	assert.equal(canResumeRun(structuredClone(current), current), true);
	assert.equal(canResumeRun({ ...current, benchmarkVersion: 1 }, current), false);
	assert.equal(canResumeRun({ ...current, method: { ...current.method, runs: 5 } }, current), false);
	assert.equal(canResumeRun({ ...current, environment: { ...current.environment, browser: 'Chrome/154' } }, current), false);
	const sample = {
		frameCount: 100, inputCount: 9, rendererCpuUtilization: 10, frameP95Ms: 17,
		inputDelayP95Ms: 1, clickToFrameP95Ms: 16,
		verification: { visible: true, stateHash: 'same', cssAnimations: 0, drawUpdates: 0, mutations: 0 }
	};
	const pair = {
		active: { ...sample, verification: { ...sample.verification, disabled: false, drawUpdates: 10 } },
		baseline: { ...sample, verification: { ...sample.verification, disabled: true } }
	};
	const result = { benchmarkVersion: 2, status: 'fixture-screened', pairs: [pair, pair, pair] };
	assert.equal(isReusableResult(result, 3), true);
	assert.equal(isReusableResult({ ...result, pairs: { length: 3 } }, 3), false);
	assert.equal(isReusableResult({ ...result, unverified: true, status: undefined }, 3), false);
	const broken = structuredClone(result);
	broken.pairs[0].baseline.verification.disabled = false;
	assert.equal(isReusableResult(broken, 3), false);
});

const appSource = await readFile(new URL('../app.js', import.meta.url), 'utf8');
test('latest actual-product report precedes older fixtures and matches native raw CPU evidence', async () => {
	const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
	const evidence = JSON.parse(await readFile(new URL('../assets/native-cpu-performance-2026-10-23.json', import.meta.url), 'utf8'));
	assert.equal(evidence.status, 'complete');
	assert.equal(evidence.environment.installedExtensionsDisabled, true);
	assert.match(html, /Latest CPU performance test · <time datetime="2026-10-23">October 23, 2026/);
	assert.ok(html.indexOf('class="native-cpu-report"') < html.indexOf('class="library-earlier-heading"'));
	assert.ok(html.indexOf('class="library-earlier-heading"') < html.indexOf('class="library-controls"'));
	for (const result of Object.values(evidence.cases)) {
		assert.equal(result.pairs.length, 7);
		assert.deepEqual(result.cpu, summarizePairs(result.pairs, 'rendererCpuUtilization'));
		assert.equal(result.rating, 'High');
		assert.match(html, new RegExp(`\\+${result.cpu.delta.toFixed(1).replace('.', '\\.')} CPU pp`));
		const range = result.cpu.range.map(value => value.toFixed(1));
		assert.ok(html.includes(`+${range[0]} to +${range[1]} pp`));
	}
	assert.match(html, /--disable-extensions/);
	assert.match(html, /not the source of their CPU measurements/);
	assert.match(html, /native-cpu-performance-2026-10-23\.json/);
});

test('Current motion tabs retain CPU evidence and bundle portable pattern references', async () => {
	const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
	const server = await readFile(new URL('../server.py', import.meta.url), 'utf8');
	const patterns = await readFile(new URL('../assets/motion-patterns/index.html', import.meta.url), 'utf8');
	assert.match(html, /id="current-motion-cpu-tab"[^>]+aria-selected="true"[^>]+aria-controls="current-motion-cpu-panel"/);
	assert.match(html, /id="current-motion-patterns-tab"[^>]+aria-selected="false"[^>]+aria-controls="current-motion-patterns-panel"/);
	assert.match(html, /id="current-motion-patterns-panel"[^>]+hidden/);
	assert.ok(html.indexOf('id="current-motion-cpu-panel"') < html.indexOf('class="native-cpu-report"'));
	assert.ok(html.indexOf('id="library-grid"') < html.indexOf('id="current-motion-patterns-panel"'));
	assert.match(html, /data-src="\.\/assets\/motion-patterns\/index\.html"/);
	assert.doesNotMatch(patterns, /(?:localhost|127\.0\.0\.1):/);
	assert.match(patterns, /Functional motion/);
	assert.match(patterns, /<details class="sources">\s*<summary>Reference provenance<\/summary>/);
	assert.match(patterns, /Decorative and expressive motion/);
	assert.match(patterns, /Reference only \/ excluded from future guidelines/);
	assert.match(appSource, /updateNavigationParameter\('currentMotionTab', selectedTab\.id\)/);
	assert.match(appSource, /patternsResizeObserver\.observe\(body\)/);
	const references = [...patterns.matchAll(/src="([^"]+\.png)"/g)].map(match => match[1]);
	assert.equal(new Set(references).size, 14);
	assert.doesNotMatch(patterns, /Download functional chart PNG|Download decorative chart PNG/);
	for (const reference of references) {
		assert.ok((await readFile(new URL(`../assets/motion-patterns/${reference}`, import.meta.url))).length > 0);
		assert.ok(server.includes(`'${reference}'`), `Local server must serve ${reference}`);
	}
});

test('Loading visual proposal is labeled, accessible and bundled without a localhost dependency', async () => {
	const root = new URL('../assets/motion-patterns/', import.meta.url);
	const patterns = await readFile(new URL('index.html', root), 'utf8');
	const proposal = await readFile(new URL('proposal.js', root), 'utf8');
	const server = await readFile(new URL('../server.py', import.meta.url), 'utf8');
	assert.match(patterns, /class="badge proposal-label">Visual unification proposed/);
	assert.match(patterns, /class="proposal-link"[^>]+href="\.\/loading-bar-proposal\/index.html"[^>]+aria-haspopup="dialog"/);
	assert.match(patterns, /<script src="\.\/proposal.js" defer>/);
	assert.match(proposal, /window\.frameElement\?\.ownerDocument \|\| document/);
	assert.match(proposal, /proposalDialog\.showModal\(\)/);
	assert.match(proposal, /proposalFrame\.removeAttribute\('src'\)/);
	assert.match(proposal, /proposalLink\.focus\(\)/);
	assert.ok(server.includes("'/assets/motion-patterns/loading-bar-proposal/{name}'"));
	const css = await readFile(new URL('loading-bar-proposal/prototype.css', root), 'utf8');
	assert.match(css, /--border-color: #333536/);
	assert.match(css, /--border-color: #3994bcb3/);
	assert.match(css, /border: 1px solid var\(--border-color\)/);
	assert.doesNotMatch(css, /border-top-color:/);
	for (const name of ['index.html', 'prototype.css', 'prototype.js', 'codicon.css', 'codicon.ttf', 'LICENSE']) {
		const content = await readFile(new URL(`loading-bar-proposal/${name}`, root));
		assert.ok(content.length > 0);
		assert.ok(server.includes(`'${name}'`));
		if (name !== 'codicon.ttf') {
			assert.doesNotMatch(content.toString(), /(?:localhost|127\.0\.0\.1):/);
		}
	}
});

test('Shared motion principle gives one functional-motion decision rule and excludes decoration', async () => {
	const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
	const section = html.match(/<section class="motion-guide-section" id="when-to-use-motion"[\s\S]*?<\/section>/)?.[0];
	assert.ok(section);
	assert.equal((html.match(/id="when-to-use-motion"/g) || []).length, 1);
	assert.equal((html.match(/href="#when-to-use-motion"/g) || []).length, 1);
	assert.equal((html.match(/href="#when-to-use-motion" data-go-to="properties"/g) || []).length, 0);
	assert.match(section, /Would motion communicate feedback, state changes, or the next action more clearly than a static presentation\?/);
	assert.match(section, /For functional motion, ask/);
	assert.match(section, /<span id="icon-guidance">When to use motion<\/span>/);
	assert.match(section, /Decorative and expressive motion are outside the scope of this guideline/);
	assert.match(section, /If <strong>yes<\/strong>, use restrained motion and preserve the same information when Reduced Motion is enabled/);
	assert.match(section, /if <strong>no<\/strong>, use a static presentation/);
	assert.doesNotMatch(section, /<table|<ol|<details/);
	const sharedRules = html.match(/<section class="motion-guide-section" id="component-rules"[\s\S]*?<\/section>/)?.[0];
	assert.match(sharedRules, /Reduced Motion/);
	assert.match(sharedRules, /Measure CPU cost/);
	assert.ok(html.indexOf('id="properties-view"') < html.indexOf('id="when-to-use-motion"'));
	assert.ok(html.indexOf('id="when-to-use-motion"') < html.indexOf('id="component-principles"'));
});

test('Light-only loading fixtures use their supported theme in tests and component links', () => {
	const lightOnlyLibraryFixtures = extractLightOnlyFixtures(appSource);
	assert.deepEqual([...lightOnlyLibraryFixtures], [
		'editor/multiDiffEditor/loading/DocumentSwapRealtime',
		'editor/multiDiffEditor/loading/IncrementalRealtime'
	]);
	assert.throws(() => extractLightOnlyFixtures('invalid'));
	const urlSource = appSource.slice(appSource.indexOf('function getLibraryFixtureUrl('), appSource.indexOf('function getLibraryFixtureThumbnailUrl('));
	const context = vm.createContext({ lightOnlyLibraryFixtures, componentExplorerUrl: 'http://localhost:5123/___explorer' });
	vm.runInContext(urlSource, context);
	for (const fixture of lightOnlyLibraryFixtures) {
		assert.equal(new URL(context.getLibraryFixtureUrl(fixture)).searchParams.get('fixture'), `${fixture}/Light`);
	}
	assert.equal(new URL(context.getLibraryFixtureUrl('chat/logoMotion/chatWorkingLogo/Draw')).searchParams.get('fixture'), 'chat/logoMotion/chatWorkingLogo/Draw/Dark');
});
const markupSource = appSource.slice(
	appSource.indexOf('function getLibraryAnimationMeasurements('),
	appSource.indexOf('function getLibraryFixturePreviewMarkup(')
);
function renderResult(result) {
	const context = vm.createContext({ libraryPerformance: { results: { fixture: result } }, escapeHtml: String });
	vm.runInContext(markupSource, context);
	return {
		rating: context.getLibraryPerformanceRating({ fixture: 'fixture' }),
		markup: context.getLibraryPerformanceMarkup({ fixture: 'fixture' }),
		animations: context.getLibraryAnimationMeasurements({ fixture: 'fixture' })
	};
}

test('legacy High labels cannot appear as current verified evidence', () => {
	const result = renderResult({ rating: 'High', incrementalRendererCpuUtilization: 7.2 });
	assert.equal(result.rating, 'unrated');
	assert.match(result.markup, /No reliable individual CPU rating/);
	assert.doesNotMatch(result.markup, /CPU pp|performance-high/);
});

function animationResult(deltas, name = 'Working logo') {
	const pairs = deltas.map(delta => ({
		active: {
			rendererCpuUtilization: 2 + delta, isolationVerifiedThroughoutSample: true,
			verification: { isolationVerified: true, targetId: '0', disabled: false, stateHash: 'same' }
		},
		baseline: {
			rendererCpuUtilization: 2, isolationVerifiedThroughoutSample: true,
			verification: { isolationVerified: true, targetId: '0', disabled: true, stateHash: 'same' }
		}
	}));
	const cpu = summarizePairs(pairs, 'rendererCpuUtilization');
	return {
		scope: 'individual-animation',
		animations: [{
			id: '0', name, benchmarkVersion: 2, scope: 'individual-animation',
			status: 'animation-screened', cpu, rating: cpuAssessment(cpu), pairs
		}]
	};
}

test('whole-component measurements cannot be used as individual-animation CPU ratings', () => {
	const result = renderResult({
		benchmarkVersion: 2, status: 'fixture-screened', rating: 'High',
		cpu: { delta: 7, range: [6, 8] }, pairs: [{}, {}, {}]
	});
	assert.equal(result.rating, 'unrated');
	assert.doesNotMatch(result.markup, /CPU pp|performance-high/);
});

test('missing and unverified measurements show a dash, never Low', () => {
	for (const result of [
		undefined,
		{ benchmarkVersion: 2, unverified: true, reason: 'Motion-off control failed' },
		{ scope: 'individual-animation', animations: [] },
		{ scope: 'individual-animation', animations: [{ name: 'Shimmer', unverified: true }] }
	]) {
		const rendered = renderResult(result);
		assert.equal(rendered.rating, 'unrated');
		assert.match(rendered.markup, /&mdash;/);
		assert.doesNotMatch(rendered.markup, /performance-low|>Low<|No slowdown detected/);
	}
});

test('individual CPU ratings use all pairs, including exact boundaries', () => {
	for (const [deltas, rating] of [
		[[5, 6, 7], 'high'],
		[[1, 2, 7], 'moderate'],
		[[4.04, 8.28, 9.44], 'moderate'],
		[[-0.9, 0, 0.9], 'low'],
		[[-1, 0, 1], 'unrated'],
		[[0.5, 5, 7], 'unrated'],
		[[-3, -2, -1], 'unrated']
	]) {
		const result = renderResult(animationResult(deltas));
		assert.equal(result.rating, rating);
		assert.match(result.markup, /Working logo/);
		if (rating === 'unrated') {
			assert.match(result.markup, /&mdash;/);
			assert.doesNotMatch(result.markup, /Inconclusive/);
		} else {
			assert.match(result.markup, /CPU pp/);
			assert.match(result.markup, /on \/ .*% off/);
		}
	}
});

test('unverified isolation and mismatched content cannot receive a CPU rating', () => {
	for (const breakPair of [
		pair => { pair.active.verification.isolationVerified = false; },
		pair => { pair.active.isolationVerifiedThroughoutSample = false; },
		pair => { pair.baseline.verification.targetId = 'other'; },
		pair => { pair.baseline.verification.disabled = false; },
		pair => { pair.baseline.verification.stateHash = 'changed'; },
		pair => { pair.active.rendererCpuUtilization = NaN; }
	]) {
		const result = animationResult([6, 7, 8]);
		breakPair(result.animations[0].pairs[0]);
		assert.equal(renderResult(result).rating, 'unrated');
	}
});

test('logo and shimmer retain separate names, costs and priorities within a card', () => {
	const result = animationResult([6, 7, 8], 'Working logo');
	result.animations.push(animationResult([1, 2, 3], 'Shimmer').animations[0]);
	const rendered = renderResult(result);
	assert.equal(rendered.rating, 'high');
	assert.equal(rendered.animations.length, 2);
	assert.match(rendered.markup, /Working logo/);
	assert.match(rendered.markup, /Shimmer/);
	assert.match(rendered.markup, /Prioritize optimization/);
	assert.match(rendered.markup, /Consider optimization/);
	assert.doesNotMatch(rendered.markup, /Speed impact|slowdown|Investigate|Needs testing/);
});

test('Current motion filters only show All, Low, Moderate and High CPU cost', async () => {
	const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
	const filters = [...html.matchAll(/data-library-performance="([^"]+)">([^<]+)</g)];
	assert.deepEqual(filters.map(match => [match[1], match[2]]), [
		['all', 'All'], ['low', 'Low'], ['moderate', 'Moderate'], ['high', 'High']
	]);
	assert.match(html, /id="library-performance-filter-label">CPU cost/);
});
