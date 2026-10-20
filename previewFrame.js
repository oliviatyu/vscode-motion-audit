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
			const animationsEnabled = options.animationsEnabled !== false;
			const animationCheckbox = [...frameDocument.querySelectorAll('input[type="checkbox"]')]
				.find(input => input.parentElement?.parentElement?.textContent?.includes('enableAnimations'));
			if (animationsEnabled && animationCheckbox && !animationCheckbox.checked) {
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
			const fixtureBounds = activeFixture.getBoundingClientRect();
			const computedWidth = Number.parseFloat(fixtureStyle.width);
			const computedHeight = Number.parseFloat(fixtureStyle.height);
			const naturalWidthPixels = Math.max(activeFixture.scrollWidth, fixtureBounds.width, computedWidth || 0);
			const naturalHeightPixels = Math.max(activeFixture.scrollHeight, fixtureBounds.height, computedHeight || 0);
			const naturalWidth = `${Math.ceil(naturalWidthPixels)}px`;
			const naturalHeight = `${Math.ceil(naturalHeightPixels)}px`;
			const fitPadding = 24;
			const naturalScale = options.centerNaturalSize
				? Math.min(
					Math.max(frameWindow.innerWidth - fitPadding, 1) / Math.max(naturalWidthPixels, 1),
					Math.max(frameWindow.innerHeight - fitPadding, 1) / Math.max(naturalHeightPixels, 1),
					1
				)
				: 1;
			const previewWidth = options.centerNaturalSize ? naturalWidth : options.fullSize ? naturalWidth : '360px';
			const previewHeight = options.centerNaturalSize ? naturalHeight : options.fullSize ? naturalHeight : '224px';
			const previewMaxWidth = options.centerNaturalSize ? 'none' : '100vw';
			const previewMaxHeight = options.centerNaturalSize ? 'none' : '100vh';
			const previewOverflow = options.centerNaturalSize ? 'visible' : 'hidden';

			const applyFixtureAnimationState = () => {
				fixtures.forEach(fixture => {
					if (animationsEnabled) {
						fixture.classList.remove('disable-animations');
					} else {
						fixture.classList.add('disable-animations');
					}
				});
			};
			applyFixtureAnimationState();
			const animationClassObserver = new frameWindow.MutationObserver(applyFixtureAnimationState);
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
					position: relative !important;
				}

				#root {
					display: none !important;
				}

				#motion-preview-fixture {
					position: relative !important;
					inset: auto !important;
					width: ${previewWidth} !important;
					height: ${previewHeight} !important;
					max-width: ${previewMaxWidth} !important;
					max-height: ${previewMaxHeight} !important;
					margin: auto !important;
					overflow: ${previewOverflow} !important;
					border: 0 !important;
					${options.centerNaturalSize ? `
						position: absolute !important;
						top: 50% !important;
						left: 50% !important;
						margin: 0 !important;
						transform: translate(-50%, -50%) scale(${naturalScale}) !important;
						transform-origin: center !important;
					` : ''}
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
				background: '#0d0f12'
			});
			if (!options.centerNaturalSize) {
				Object.assign(activeFixture.style, {
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center'
				});
			}
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
