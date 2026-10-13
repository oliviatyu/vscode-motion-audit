window.MotionPreview = (() => {
	async function preparePreviewFrame(frame, options = {}) {
		try {
			const frameWindow = frame.contentWindow;
			const frameDocument = frame.contentDocument;
			if (!frameWindow || !frameDocument) {
				return false;
			}

			await waitForElement(frameWindow, '.component-fixture-container');
			await delay(80);
			const animationCheckbox = [...frameDocument.querySelectorAll('input[type="checkbox"]')]
				.find(input => input.parentElement?.parentElement?.textContent?.includes('enableAnimations'));
			if (animationCheckbox && !animationCheckbox.checked) {
				animationCheckbox.click();
				await delay(120);
			}

			const fixtures = [...frameDocument.querySelectorAll('.component-fixture-container')];
			const activeFixture = fixtures.find(fixture => fixture.classList.contains('vs-dark')) ?? fixtures[0];
			const root = frameDocument.getElementById('root');
			if (!activeFixture || !root) {
				return false;
			}
			const fixtureStyle = frameWindow.getComputedStyle(activeFixture);
			const computedWidth = Number.parseFloat(fixtureStyle.width) > 0 ? fixtureStyle.width : 'fit-content';
			const computedHeight = Number.parseFloat(fixtureStyle.height) > 0 ? fixtureStyle.height : 'fit-content';
			const naturalWidth = activeFixture.style.width || computedWidth;
			const naturalHeight = activeFixture.style.height || computedHeight;

			const enableFixtureAnimations = () => {
				fixtures.forEach(fixture => {
					if (fixture.classList.contains('disable-animations')) {
						fixture.classList.remove('disable-animations');
					}
				});
			};
			enableFixtureAnimations();
			const animationClassObserver = new frameWindow.MutationObserver(enableFixtureAnimations);
			fixtures.forEach(fixture => animationClassObserver.observe(fixture, { attributes: true, attributeFilter: ['class'] }));
			activeFixture.id = 'motion-preview-fixture';
			frameDocument.body.appendChild(activeFixture);
			root.hidden = true;
			const previewStyles = frameDocument.createElement('style');
			previewStyles.textContent = `
				html,
				body {
					width: 100% !important;
					height: 100% !important;
					margin: 0 !important;
					overflow: auto !important;
					background: #0d0f12 !important;
				}

				body {
					display: grid !important;
					place-items: center !important;
				}

				#root {
					display: none !important;
				}

				#motion-preview-fixture {
					position: relative !important;
					inset: auto !important;
					width: ${options.fullSize ? naturalWidth : '360px'} !important;
					height: ${options.fullSize ? naturalHeight : '224px'} !important;
					max-width: 100vw !important;
					max-height: 100vh !important;
					margin: auto !important;
					overflow: hidden !important;
					border: 0 !important;
				}
			`;
			frameDocument.head.appendChild(previewStyles);
			Object.assign(frameDocument.documentElement.style, {
				overflow: 'hidden',
				background: '#0d0f12'
			});
			Object.assign(frameDocument.body.style, {
				margin: '0',
				overflow: 'hidden',
				background: '#0d0f12'
			});
			Object.assign(activeFixture.style, {
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				background: '#0d0f12'
			});
			return true;
		} catch {
			frame.title = `${frame.title} (preview unavailable)`;
			return false;
		}
	}

	function waitForElement(frameWindow, selector, timeout = 6000) {
		return new Promise((resolve, reject) => {
			const existing = frameWindow.document.querySelector(selector);
			if (existing) {
				resolve(existing);
				return;
			}

			const observer = new frameWindow.MutationObserver(() => {
				const element = frameWindow.document.querySelector(selector);
				if (element) {
					observer.disconnect();
					frameWindow.clearTimeout(timer);
					resolve(element);
				}
			});
			observer.observe(frameWindow.document.documentElement, { childList: true, subtree: true });
			const timer = frameWindow.setTimeout(() => {
				observer.disconnect();
				reject(new Error(`Timed out waiting for ${selector}`));
			}, timeout);
		});
	}

	function delay(milliseconds) {
		return new Promise(resolve => window.setTimeout(resolve, milliseconds));
	}

	return { preparePreviewFrame };
})();
