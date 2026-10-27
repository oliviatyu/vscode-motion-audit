const proposalLink = document.querySelector('.proposal-link');
const hostDocument = window.frameElement?.ownerDocument || document;
let proposalDialog;
let proposalFrame;

proposalLink.addEventListener('click', event => {
	if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
		return;
	}
	event.preventDefault();
	if (!proposalDialog) {
		const style = hostDocument.createElement('style');
		style.textContent = `
			.motion-proposal-dialog { width: min(1520px, calc(100vw - 48px)); max-width: none; height: min(960px, calc(100dvh - 48px)); max-height: none; margin: auto; padding: 0; border: 1px solid #50555b; border-radius: 12px; background: #101112; color: #e7e7e7; }
			.motion-proposal-dialog[open] { display: flex; flex-direction: column; }
			.motion-proposal-dialog::backdrop { background: #000a; }
			.motion-proposal-dialog .proposal-modal-header { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 12px 20px; border-bottom: 1px solid #393c40; }
			.motion-proposal-dialog h2 { margin: 0; font: 600 16px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
			.motion-proposal-dialog .proposal-modal-close { padding: 6px 12px; border: 1px solid #50555b; border-radius: 6px; background: #222528; color: #e7e7e7; font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; cursor: pointer; }
			.motion-proposal-dialog .proposal-modal-close:focus-visible { outline: 2px solid #90caff; outline-offset: 3px; }
			.motion-proposal-dialog iframe { display: block; flex: 1; width: 100%; min-height: 0; border: 0; }
			@media (max-width: 700px) { .motion-proposal-dialog { width: calc(100vw - 16px); height: calc(100dvh - 16px); } }
		`;
		hostDocument.head.append(style);
		proposalDialog = hostDocument.createElement('dialog');
		proposalDialog.className = 'motion-proposal-dialog';
		proposalDialog.setAttribute('aria-labelledby', 'loading-proposal-title');
		proposalDialog.innerHTML = `
			<div class="proposal-modal-header">
				<h2 id="loading-proposal-title">Proposed visual unification</h2>
				<button class="proposal-modal-close" type="button" autofocus>Close</button>
			</div>
			<iframe title="Unified loading-bar proposal"></iframe>
		`;
		proposalFrame = proposalDialog.querySelector('iframe');
		proposalFrame.addEventListener('load', () => {
			if (!proposalFrame.hasAttribute('src')) {
				return;
			}
			proposalFrame.contentDocument.addEventListener('keydown', key => {
				if (key.key === 'Escape') {
					key.preventDefault();
					proposalDialog.close();
				}
			});
		});
		proposalDialog.querySelector('button').addEventListener('click', () => proposalDialog.close());
		proposalDialog.addEventListener('close', () => {
			proposalFrame.removeAttribute('src');
			proposalLink.focus();
		});
		proposalDialog.addEventListener('click', click => {
			if (click.target !== proposalDialog) {
				return;
			}
			const bounds = proposalDialog.getBoundingClientRect();
			if (click.clientX < bounds.left || click.clientX > bounds.right || click.clientY < bounds.top || click.clientY > bounds.bottom) {
				proposalDialog.close();
			}
		});
		hostDocument.body.append(proposalDialog);
	}
	proposalFrame.src = proposalLink.href;
	proposalDialog.showModal();
});
