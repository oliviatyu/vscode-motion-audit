const playback = document.getElementById('playback');
const reducedMotion = document.getElementById('reduced-motion');
const status = document.getElementById('motion-status');
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
let paused = false;
let previewReducedMotion = false;

function updateMotion() {
	const reduced = motionPreference.matches || previewReducedMotion;
	document.body.classList.toggle('paused', paused);
	document.body.classList.toggle('page-hidden', document.hidden);
	document.body.classList.toggle('reduced-motion', reduced);
	playback.textContent = paused ? 'Resume motion' : 'Pause motion';
	playback.setAttribute('aria-pressed', String(paused));
	playback.disabled = reduced;
	reducedMotion.setAttribute('aria-pressed', String(previewReducedMotion));
	reducedMotion.disabled = motionPreference.matches;
	status.textContent = reduced
		? 'Reduced Motion: static border highlight; loading status stays readable.'
		: paused ? 'Paused at the current position in both surfaces.'
			: 'Both surfaces share the same back-and-forth motion. No percentage is implied.';
}

playback.addEventListener('click', () => {
	paused = !paused;
	updateMotion();
});
reducedMotion.addEventListener('click', () => {
	previewReducedMotion = !previewReducedMotion;
	updateMotion();
});
motionPreference.addEventListener('change', updateMotion);
document.addEventListener('visibilitychange', updateMotion);
updateMotion();
