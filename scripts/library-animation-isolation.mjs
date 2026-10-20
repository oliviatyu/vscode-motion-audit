// Runs inside the benchmark parent; only one motion instance may advance.
export function installAnimationIsolation() {
	const harness = window.motionBenchmark;
	const setGlobalMotion = harness.setMotion;
	const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
	const describe = animation => ({
		name: animation.animationName || animation.id || 'Web Animation',
		element: animation.effect.target,
		pseudoElement: animation.effect.pseudoElement ?? ''
	});
	const visible = element => {
		const bounds = element.getBoundingClientRect();
		const style = element.ownerDocument.defaultView.getComputedStyle(element);
		return bounds.width > 0 && bounds.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
	};
	harness.discoverAnimations = async () => {
		await setGlobalMotion(true);
		await wait(700);
		const fixture = harness.fixture();
		const targets = [];
		for (const element of fixture.querySelectorAll('.chat-working-logo-draw.chat-working-logo-active')) {
			if (visible(element)) {
				const bounds = element.getBoundingClientRect();
				targets.push({
					kind: 'svg-draw', element,
					name: `Working logo (SVG Draw, ${Math.round(bounds.width)} x ${Math.round(bounds.height)} px)`
				});
			}
		}
		for (const animation of fixture.getAnimations({ subtree: true })) {
			const timing = animation.effect?.getComputedTiming();
			if (animation.playState !== 'running' || timing?.iterations !== Infinity ||
				!animation.effect.target || !visible(animation.effect.target)) {
				continue;
			}
			const descriptor = describe(animation);
			const spinner = descriptor.element.closest('.monaco-pixel-spinner');
			const root = spinner ?? descriptor.element;
			let group = targets.find(target => target.kind === 'web-animation' && target.element === root &&
				target.pseudoElement === (spinner ? '' : descriptor.pseudoElement));
			if (!group) {
				group = {
					kind: 'web-animation', element: root, pseudoElement: spinner ? '' : descriptor.pseudoElement,
					name: spinner ? `Pixel spinner (${spinner.classList.contains('monaco-pixel-spinner-ring') ? 'ring' : 'grid'})`
						: `${descriptor.name}${descriptor.pseudoElement ? ` (${descriptor.pseudoElement})` : ''}`,
					members: []
				};
				targets.push(group);
			}
			group.members.push({
				...descriptor,
				ordinal: group.members.filter(member => member.element === descriptor.element &&
					member.name === descriptor.name && member.pseudoElement === descriptor.pseudoElement).length
			});
		}
		harness.animationTargets = targets;
		return targets.map(({ kind, name, element, members }, index) => ({
			id: String(index), kind, name,
			element: element.tagName.toLowerCase(),
			classes: element.getAttribute('class') ?? '',
			instance: index + 1, timelineCount: members?.length ?? 0
		}));
	};
	harness.setMotion = async enabled => {
		const fixture = harness.fixture();
		const target = harness.animationTargets[Number(harness.selectedAnimation)];
		if (!target?.element.isConnected) {
			throw new Error('The selected animation element changed; requires action replay.');
		}
		setGlobalMotion(false);
		await wait(80);
		fixture.querySelectorAll('.chat-working-logo-draw').forEach(element => {
			element.classList.toggle('disable-animations', !(enabled && target.kind === 'svg-draw' && target.element === element));
		});
		setGlobalMotion(true);
		await wait(150);
		const animations = fixture.getAnimations({ subtree: true });
		const selected = new Set((target.members ?? []).map(member => animations.filter(animation => {
			const descriptor = describe(animation);
			return descriptor.element === member.element && descriptor.name === member.name &&
				descriptor.pseudoElement === member.pseudoElement;
		})[member.ordinal]));
		if (selected.has(undefined) || target.kind === 'web-animation' && selected.size !== target.members.length) {
			throw new Error('The selected Web Animation was replaced or stopped; requires action replay.');
		}
		for (const animation of animations) {
			if (enabled && selected.has(animation)) {
				animation.play();
			} else {
				animation.pause();
			}
		}
		harness.isolatedEnabled = enabled;
		harness.isolatedWebAnimations = selected;
	};
	const observeMutations = (fixture, target) => {
		let mutations = 0;
		let drawUpdates = 0;
		let otherMutations = 0;
		const observer = new MutationObserver(records => {
			mutations += records.length;
			for (const record of records) {
				if (target.kind === 'svg-draw' && target.element.contains(record.target) &&
					record.attributeName === 'd' && record.target.matches('.chat-working-logo-draw-band')) {
					drawUpdates++;
				} else if (target.kind === 'svg-draw' && record.target === target.element && record.attributeName === 'class' &&
					(record.oldValue ?? '').replace(/\bchat-working-logo-draw-assembled\b/g, '').trim() ===
					target.element.className.replace(/\bchat-working-logo-draw-assembled\b/g, '').trim()) {
					continue;
				} else {
					otherMutations++;
				}
			}
		});
		observer.observe(fixture, { subtree: true, attributes: true, attributeOldValue: true, childList: true, characterData: true });
		return () => {
			observer.disconnect();
			return { mutations, drawUpdates, otherMutations };
		};
	};
	harness.verifyMotion = async () => {
		const fixture = harness.fixture();
		const target = harness.animationTargets[Number(harness.selectedAnimation)];
		const before = new Map(fixture.getAnimations({ subtree: true }).map(animation => [animation, animation.currentTime]));
		const stopObserving = observeMutations(fixture, target);
		const text = fixture.innerText;
		await wait(500);
		const { mutations, drawUpdates, otherMutations } = stopObserving();
		const after = fixture.getAnimations({ subtree: true });
		const advancing = after.filter(animation => {
			const start = before.get(animation);
			return typeof start === 'number' && typeof animation.currentTime === 'number' &&
				animation.currentTime - start > 1;
		});
		const unexpectedAnimations = after.some(animation => !before.has(animation)) ||
			advancing.some(animation => !harness.isolatedWebAnimations.has(animation));
		const selectedAdvances = advancing.length === harness.isolatedWebAnimations.size &&
			advancing.every(animation => harness.isolatedWebAnimations.has(animation));
		if (unexpectedAnimations || otherMutations > 0 ||
			(!harness.isolatedEnabled && (advancing.length > 0 || mutations > 0)) ||
			(harness.isolatedEnabled && (target.kind === 'svg-draw' ? drawUpdates === 0 : !selectedAdvances))) {
			throw new Error(`Individual animation isolation could not be verified: ${otherMutations} unrelated mutations, ${advancing.length} advancing timelines, ${drawUpdates} selected Draw updates, enabled=${harness.isolatedEnabled}, unexpected timelines=${unexpectedAnimations}.`);
		}
		return {
			isolationVerified: true, targetId: harness.selectedAnimation,
			cssAnimations: advancing.length, mutations, drawUpdates, otherMutations,
			text, textChanged: text !== fixture.innerText,
			disabled: !harness.isolatedEnabled,
			visible: visible(target.element),
			logoCount: target.kind === 'svg-draw' ? 1 : 0
		};
	};
	const startSample = harness.startSample;
	const endSample = harness.endSample;
	harness.startSample = () => {
		const fixture = harness.fixture();
		const target = harness.animationTargets[Number(harness.selectedAnimation)];
		harness.stopIsolationObserver = observeMutations(fixture, target);
		harness.sampleText = fixture.innerText;
		harness.sampleTimelines = new Map(fixture.getAnimations({ subtree: true }).map(animation => [animation, animation.currentTime]));
		startSample();
	};
	harness.endSample = () => {
		const sample = endSample();
		const updates = harness.stopIsolationObserver();
		const fixture = harness.fixture();
		const animations = fixture.getAnimations({ subtree: true });
		const otherTimelineAdvanced = animations.some(animation =>
			!harness.sampleTimelines.has(animation) ||
			(!harness.isolatedWebAnimations.has(animation) || !harness.isolatedEnabled) &&
			animation.currentTime !== harness.sampleTimelines.get(animation));
		if (updates.otherMutations > 0 || otherTimelineAdvanced || fixture.innerText !== harness.sampleText ||
			(!harness.isolatedEnabled && updates.mutations > 0)) {
			throw new Error('Other motion or content changed during the CPU window; individual attribution rejected.');
		}
		return { ...sample, isolationVerifiedThroughoutSample: true, isolatedUpdates: updates };
	};
}
