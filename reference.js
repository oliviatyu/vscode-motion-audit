const parameters = new URLSearchParams(window.location.search);
const fixture = parameters.get('fixture');
const name = parameters.get('name') || 'Motion reference';
const state = parameters.get('state');
const title = document.getElementById('reference-title');
const status = document.getElementById('reference-status');
const frame = document.getElementById('reference-frame');
const componentExplorerLink = document.getElementById('component-explorer-link');

title.textContent = name;
document.title = `${name} — Motion reference`;

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
		const prepared = await window.MotionPreview.preparePreviewFrame(frame, { fullSize: true });
		if (!prepared) {
			status.textContent = 'Preview unavailable';
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
