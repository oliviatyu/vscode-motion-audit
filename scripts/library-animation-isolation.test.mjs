import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { installAnimationIsolation } from './library-animation-isolation.mjs';

function createHarness() {
	const observers = [];
	const element = {
		isConnected: true, tagName: 'SPAN',
		getAttribute: () => 'thinking-label',
		closest: () => null,
		getBoundingClientRect: () => ({ width: 100, height: 20 }),
		ownerDocument: { defaultView: { getComputedStyle: () => ({ visibility: 'visible', display: 'block' }) } }
	};
	const animations = ['shimmer', 'spinner'].map(name => {
		let time = 0;
		return {
			animationName: name, playState: 'running',
			effect: { target: { ...element }, getComputedTiming: () => ({ iterations: Infinity }) },
			get currentTime() {
				if (this.playState === 'running') {
					time += 10;
				}
				return time;
			},
			play() { this.playState = 'running'; },
			pause() { this.playState = 'paused'; }
		};
	});
	const fixture = {
		innerText: 'Working', querySelectorAll: () => [],
		getAnimations: () => animations
	};
	const harness = {
		fixture: () => fixture,
		setMotion: enabled => animations.forEach(animation => enabled ? animation.play() : animation.pause()),
		startSample() {},
		endSample: () => ({ rendererCpuUtilization: 2 })
	};
	const context = vm.createContext({
		window: { motionBenchmark: harness },
		setTimeout: callback => callback(),
		MutationObserver: class {
			constructor(callback) { this.callback = callback; observers.push(this); }
			observe() { this.active = true; }
			disconnect() { this.active = false; }
		}
	});
	vm.runInContext(`(${installAnimationIsolation.toString()})()`, context);
	return { harness, fixture, animations, observers };
}

test('discovers separate animation instances and advances only the selected timeline', async () => {
	const { harness, animations } = createHarness();
	const targets = await harness.discoverAnimations();
	assert.equal(targets.length, 2);
	assert.equal(targets[0].name, 'shimmer');
	assert.equal(targets[1].name, 'spinner');
	harness.selectedAnimation = '0';
	await harness.setMotion(true);
	assert.equal(animations[0].playState, 'running');
	assert.equal(animations[1].playState, 'paused');
	const active = await harness.verifyMotion();
	assert.equal(active.isolationVerified, true);
	assert.equal(active.cssAnimations, 1);
	harness.startSample();
	assert.equal(harness.endSample().isolationVerifiedThroughoutSample, true);
	await harness.setMotion(false);
	assert.ok(animations.every(animation => animation.playState === 'paused'));
	assert.equal((await harness.verifyMotion()).cssAnimations, 0);
});

test('rejects an unrelated animation advancing instead of silently attributing its CPU', async () => {
	const { harness, animations } = createHarness();
	await harness.discoverAnimations();
	harness.selectedAnimation = '0';
	await harness.setMotion(true);
	animations[1].play();
	await assert.rejects(harness.verifyMotion(), /unexpected timelines=true/);
});

test('rejects unrelated mutations and changed content during the full CPU window', async () => {
	const { harness, fixture, observers } = createHarness();
	await harness.discoverAnimations();
	harness.selectedAnimation = '0';
	await harness.setMotion(true);
	harness.startSample();
	for (const observer of observers.filter(observer => observer.active)) {
		observer.callback([{ target: {}, attributeName: 'style' }]);
	}
	assert.throws(() => harness.endSample(), /individual attribution rejected/);
	harness.startSample();
	fixture.innerText = 'Changed response';
	assert.throws(() => harness.endSample(), /individual attribution rejected/);
});

test('rejects unrelated timeline changes during the full CPU window', async () => {
	const { harness, animations } = createHarness();
	await harness.discoverAnimations();
	harness.selectedAnimation = '0';
	await harness.setMotion(false);
	harness.startSample();
	animations[1].play();
	assert.throws(() => harness.endSample(), /individual attribution rejected/);
});

test('finite transitions and missing targets do not receive idle-state ratings', async () => {
	const { harness, animations } = createHarness();
	animations[0].effect.getComputedTiming = () => ({ iterations: 1 });
	const targets = await harness.discoverAnimations();
	assert.equal(targets.length, 1);
	assert.equal(targets[0].name, 'spinner');
	harness.selectedAnimation = '9';
	await assert.rejects(harness.setMotion(true), /requires action replay/);
});

test('a multi-dot spinner is one visual animation, not separate dot ratings', async () => {
	const { harness, animations } = createHarness();
	const spinner = {
		...animations[0].effect.target,
		classList: { contains: () => false }
	};
	for (const animation of animations) {
		animation.effect.target.closest = () => spinner;
	}
	const targets = await harness.discoverAnimations();
	assert.equal(targets.length, 1);
	assert.equal(targets[0].name, 'Pixel spinner (grid)');
	assert.equal(targets[0].timelineCount, 2);
	harness.selectedAnimation = '0';
	await harness.setMotion(true);
	assert.ok(animations.every(animation => animation.playState === 'running'));
	assert.equal((await harness.verifyMotion()).cssAnimations, 2);
	await harness.setMotion(false);
	assert.ok(animations.every(animation => animation.playState === 'paused'));
});
