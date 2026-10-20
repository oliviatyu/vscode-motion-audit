import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { median, summarizePairs, cpuAssessment, extractFixtures, extractLightOnlyFixtures, requiresBrowserRestart, canResumeRun, isReusableResult } from './library-performance-utils.mjs';

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
