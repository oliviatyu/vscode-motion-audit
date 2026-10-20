const parameters = new URLSearchParams(window.location.search);
const fixture = parameters.get('fixture');
const name = parameters.get('name') || 'Motion reference';
const state = parameters.get('state');
const captureThumbnail = parameters.get('capture') === 'thumbnail';
const benchmarkMotion = parameters.get('benchmarkMotion');
const title = document.getElementById('reference-title');
const status = document.getElementById('reference-status');
const frame = document.getElementById('reference-frame');
const componentExplorerLink = document.getElementById('component-explorer-link');

title.textContent = name;
document.title = `${name} — Motion reference`;
document.body.classList.toggle('reference-capture', captureThumbnail);

if (!fixture) {
	status.textContent = 'Fixture path is missing';
	frame.hidden = true;
	componentExplorerLink.hidden = true;
} else {
	const fixtureName = fixture.split('/').at(-1) || name;
	const componentExplorerUrl = `${window.location.origin}/___explorer?fixture=${encodeURIComponent(fixture)}&search=${encodeURIComponent(fixtureName)}`;
	componentExplorerLink.href = componentExplorerUrl;
	frame.title = `${name} in Component Explorer`;
	frame.src = componentExplorerUrl;
	frame.addEventListener('load', async () => {
		const prepared = await window.MotionPreview.preparePreviewFrame(
			frame,
			captureThumbnail
				? { centerNaturalSize: true }
				: { fullSize: true, animationsEnabled: benchmarkMotion !== 'disabled' }
		);
		if (!prepared) {
			status.textContent = 'Preview unavailable';
			return;
		}

		if (captureThumbnail) {
			window.setTimeout(() => {
				frame.contentDocument?.getAnimations({ subtree: true }).forEach(animation => animation.pause());
				document.body.dataset.captureReady = 'true';
			}, 600);
			return;
		}

		if (benchmarkMotion) {
			const animations = frame.contentDocument?.getAnimations({ subtree: true }) ?? [];
			if (benchmarkMotion === 'disabled') {
				animations.forEach(animation => {
					animation.currentTime = 0;
					animation.pause();
				});
			} else {
				animations.forEach(animation => {
					animation.currentTime = 0;
					animation.play();
				});
			}
			status.textContent = 'Benchmark ready';
			return;
		}

		const playAnimations = () => {
			frame.contentDocument?.getAnimations({ subtree: true }).forEach(animation => animation.play());
		};
		playAnimations();
		window.setTimeout(playAnimations, 250);
		status.textContent = state ? `${state} evidence` : 'Animation playing';
	});
}
