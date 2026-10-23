(() => {
	const host = document.getElementById('motion-prototype');
	if (!host) {
		return;
	}

	const initialSessions = [
		{ id: 'quick', title: 'Recover chat history', group: 'Chats', status: 'working', detail: 'Restoring previous conversations' },
		{ id: 'workspace', title: 'Improve the onboarding flow', group: 'motion-lab', status: 'working', detail: 'Checking the welcome experience' },
		{ id: 'nested', title: 'Review keyboard navigation', group: 'motion-lab', parent: 'workspace', status: 'working', detail: 'Inspecting focus order and shortcuts' },
		{ id: 'question', title: 'Choose the welcome layout', group: 'motion-lab', status: 'input', detail: 'Which layout should I use?' },
		{ id: 'approval', title: 'Run the integration tests', group: 'motion-lab', status: 'approval', detail: 'npm run test:integration' },
		{ id: 'error', title: 'Check the build pipeline', group: 'motion-lab', status: 'error', detail: 'Build failed. Review the output.' },
		{ id: 'unread', title: 'Update the empty state', group: 'motion-lab', status: 'unread', detail: 'Completed · unread result' },
		{ id: 'done', title: 'Adjust button spacing', group: 'motion-lab', status: 'complete', detail: '+24 −8 · 8 mins ago' },
		{ id: 'idle', title: 'Explore navigation patterns', group: 'design-system', status: 'idle', detail: 'Yesterday' }
	];
	const statusNames = { working: 'Working', input: 'Input needed', approval: 'Permission required', error: 'Error', unread: 'Completed, unread', complete: 'Completed', idle: 'Idle' };
	const icons = { warning: '\uea6c', folder: '\uea83', check: '\ueab2', error: '\uea87', down: '\ueab4', right: '\ueab6', add: '\uea60', stop: '\uead7', send: '\uec0f', search: '\uea6d', filter: '\ueaf1', gear: '\ueaf8', more: '\uea7c', dot: '\uea71' };
	const icon = name => name === 'question'
		? `<svg class="mp-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 11.5 3 14v-2.5h-.5A1.5 1.5 0 0 1 1 10V3a1.5 1.5 0 0 1 1.5-1.5h11A1.5 1.5 0 0 1 15 3v7a1.5 1.5 0 0 1-1.5 1.5H6Z" stroke="currentColor" stroke-linejoin="round"/><path d="M6.25 5a1.75 1.75 0 1 1 2.9 1.32C8.45 6.88 8 7.13 8 8" stroke="currentColor" stroke-linecap="round"/><circle cx="8" cy="9.6" r=".55" fill="currentColor"/></svg>`
		: `<span class="mp-icon" aria-hidden="true">${icons[name]}</span>`;
	const spinner = () => `<span class="monaco-pixel-spinner" aria-hidden="true">${'<span class="monaco-pixel-spinner-dot"></span>'.repeat(6)}</span>`;
	const escape = value => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
	let sessions;
	let selectedId;
	let collapsed;
	let layout = 'single';
	let paused = false;
	let reduced = false;

	host.innerHTML = `
		<div class="mp-toolbar" aria-label="Baseline prototype controls">
			<label>Chat layout <select data-mp-layout><option value="single">Single view</option><option value="tabs">Tabbed view</option><option value="split">Split view</option></select></label>
			<button class="button button-secondary" type="button" data-mp-pause aria-pressed="false">Pause motion</button>
			<label><input type="checkbox" data-mp-reduced> Reduced Motion</label>
			<button class="button button-secondary" type="button" data-mp-reset>Reset baseline</button>
			<button class="button button-secondary" type="button" data-mp-fullscreen>Full screen</button>
		</div>
		<div class="mp-viewport">
			<div class="mp-workbench">
				<div class="mp-titlebar"><span class="mp-window-controls" aria-hidden="true"><i></i><i></i><i></i></span><span>‹ &nbsp; › &nbsp; ${icon('folder')} motion-lab</span><span aria-hidden="true">▥ &nbsp; ◫</span></div>
				<div class="mp-workspace">
					<aside class="mp-sidebar" aria-label="Prototype Sessions panel">
						<div class="mp-navigation"><span>${icon('add')} New Session <kbd>⌘ N</kbd></span><span>${icon('gear')} Automations</span><span>${icon('dot')} Customizations</span></div>
						<div class="mp-section-heading">Sessions <span aria-hidden="true">${icon('filter')} ${icon('search')} ${icon('more')}</span></div>
						<div data-mp-sessions></div>
						<div class="mp-done">${icon('check')} Done</div>
					</aside>
					<div class="mp-chat-area" data-mp-chat-area></div>
				</div>
				<div class="mp-statusbar"><span>motion-lab &nbsp; main</span><span>Simulated agent · no commands executed</span></div>
			</div>
		</div>
		<p class="mp-announcement visually-hidden" role="status" aria-live="polite" aria-atomic="true"></p>`;

	const announce = text => { host.querySelector('.mp-announcement').textContent = text; };
	const statusIcon = session => {
		if (session.status === 'working') {
			return spinner();
		}
		const name = { input: 'question', approval: 'question', error: 'warning', unread: 'dot', complete: 'check', idle: 'dot' }[session.status];
		return icon(name);
	};
	function reset() {
		sessions = initialSessions.map(session => ({ ...session }));
		selectedId = 'nested';
		collapsed = new Set();
		render();
		host.querySelector('.mp-sidebar').scrollTop = 0;
	}

	function sessionRow(session) {
		const selected = session.id === selectedId;
		const children = sessions.filter(child => child.parent === session.id);
		const isCollapsed = collapsed.has(session.id);
		const working = session.status === 'working';
		return `<div class="mp-session-row mp-state-${session.status}${selected ? ' mp-selected' : ''}${session.parent ? ' mp-nested' : ''}" data-mp-row="${session.id}">
			${children.length ? `<button type="button" class="mp-disclosure" data-mp-collapse="${session.id}" aria-expanded="${!isCollapsed}" aria-label="${isCollapsed ? 'Expand' : 'Collapse'} chats in ${escape(session.title)}">${icon(isCollapsed ? 'right' : 'down')}</button>` : ''}
			<button type="button" class="mp-session-select" data-mp-select="${session.id}" aria-current="${selected}" aria-label="${escape(session.title)}, ${statusNames[session.status]}${children.length && isCollapsed ? ', nested chat hidden' : ''}">
				<span class="mp-session-icon">${statusIcon(session)}</span>
				<span class="mp-session-body"><span class="mp-session-title${working && !session.parent ? ' mp-title-shimmer' : ''}">${escape(session.title)}</span>
				<span class="mp-session-detail">${working ? 'Working…' : session.status === 'approval' ? 'Manual permission' : escape(session.detail)}</span></span>
			</button>
			${session.status === 'approval' ? `<div class="mp-approval-inline"><code>${escape(session.detail)}</code><button type="button" data-mp-allow="${session.id}">Allow</button></div>` : ''}
		</div>`;
	}

	function headerStatus(session) {
		// Retain the session-scoped header behavior under review, even for a nested chat.
		const parent = sessions.find(candidate => candidate.id === session.parent) ?? session;
		const family = [parent, ...sessions.filter(candidate => candidate.parent === parent.id)];
		return family.find(candidate => candidate.status === 'input' || candidate.status === 'approval')
			?? family.find(candidate => candidate.status === 'working')
			?? parent;
	}

	function chatPane(session, secondary = false) {
		const working = session.status === 'working';
		const waiting = session.status === 'input' || session.status === 'approval';
		const header = headerStatus(session);
		const prompt = session.prompt || (working ? 'Review the onboarding experience and suggest improvements.' : session.status === 'approval' ? 'Run the integration tests before we continue.' : session.status === 'input' ? 'Help me choose a welcome layout.' : 'Review this part of the experience.');
		let content;
		if (working) {
			content = `<p>I’ll check the current implementation and review the interaction states.</p>
				<div class="mp-tool-line">${icon('check')} Read onboarding.tsx <span>Completed</span></div>
				<div class="mp-tool-line">${icon('check')} Inspect navigation structure <span>Completed</span></div>
				<div class="mp-progress"><span class="mp-working-logo" aria-hidden="true"></span><span class="mp-chat-shimmer">${escape(session.detail)}</span></div>
				<p class="mp-subtle">Simulated work is in progress. No real agent request is running.</p>`;
		} else if (waiting) {
			content = `<p>${session.status === 'approval' ? 'The next command needs your permission before I can continue.' : 'I need your choice before continuing with the layout.'}</p>
				<div class="mp-question"><strong>${session.status === 'approval' ? 'Allow this command?' : 'Which welcome layout should I use?'}</strong>
				${session.status === 'approval' ? `<code>${escape(session.detail)}</code><p>Manual permission · motion-lab</p><button type="button" class="mp-primary" data-mp-allow="${session.id}">Allow</button>` : `<label><input type="radio" name="mp-layout-answer" value="Compact" checked> Compact list</label><label><input type="radio" name="mp-layout-answer" value="Expanded"> Expanded cards</label><button type="button" class="mp-primary" data-mp-answer="${session.id}">Submit</button>`}</div>
				<div class="mp-waiting">${icon('question')} Input needed</div>`;
		} else if (session.status === 'error') {
			content = `<div class="mp-error-message">${icon('warning')} Build failed</div><p>The simulated build could not complete. Review the output or retry.</p><pre>Missing test fixture: onboarding.welcome</pre><button type="button" class="mp-primary" data-mp-retry="${session.id}">Retry</button>`;
		} else {
			content = `<p>The review is complete. The updated layout keeps the primary action clear and preserves keyboard navigation.</p><div class="mp-result">${icon('check')} Changes ready for review <span>+24 −8</span></div>`;
		}
		return `<section class="mp-chat" aria-label="${escape(session.title)} chat">
			<div class="mp-chat-header"><span class="mp-header-icon mp-state-${header.status}">${statusIcon(header)}</span><strong>${escape(session.title)}</strong><span class="mp-chat-header-actions" aria-hidden="true">${icon('more')}</span></div>
			<div class="mp-transcript" tabindex="0" aria-label="${escape(session.title)} conversation">
				<div class="mp-user-message">${escape(prompt)}</div>
				<div class="mp-response">${content}</div>
			</div>
			<form class="mp-composer${working ? ' mp-composer-working' : ''}" data-mp-form="${session.id}">
				<label class="visually-hidden" for="mp-prompt-${secondary ? 'secondary' : 'primary'}">Message ${escape(session.title)}</label>
				<textarea id="mp-prompt-${secondary ? 'secondary' : 'primary'}" name="prompt" placeholder="Chat with Copilot" rows="2"></textarea>
				<div class="mp-composer-bottom"><span>${icon('add')} &nbsp; Interactive &nbsp; <span class="mp-permissions">Manual permissions</span></span><span>Model · Auto &nbsp; ${working ? `<button type="button" data-mp-stop="${session.id}" aria-label="Stop simulated work">${icon('stop')}</button>` : `<button type="submit" aria-label="Send simulated prompt">${icon('send')}</button>`}</span></div>
			</form>
		</section>`;
	}

	function render() {
		host.querySelector('[data-mp-sessions]').innerHTML = ['Chats', 'motion-lab', 'design-system'].map(group => {
			const rows = sessions.filter(session => session.group === group && !session.parent);
			return `<div class="mp-group-heading">${icon('folder')} ${group}</div>${rows.map(session => sessionRow(session) + (collapsed.has(session.id) ? '' : sessions.filter(child => child.parent === session.id).map(sessionRow).join(''))).join('')}`;
		}).join('');
		const selected = sessions.find(session => session.id === selectedId);
		const secondary = sessions.find(session => session.id === 'question');
		const chatArea = host.querySelector('[data-mp-chat-area]');
		chatArea.classList.toggle('mp-split', layout === 'split');
		chatArea.innerHTML = `${layout === 'tabs' ? `<div class="mp-chat-tabs" role="tablist" aria-label="Prototype chats">${sessions.filter(session => ['nested', 'question', 'approval', selectedId].includes(session.id)).map(session => `<button type="button" role="tab" aria-selected="${session.id === selectedId}" tabindex="${session.id === selectedId ? 0 : -1}" data-mp-select="${session.id}">${statusIcon(session)} ${escape(session.title)}</button>`).join('')}</div>` : ''}<div class="mp-chat-panes">${chatPane(selected)}${layout === 'split' ? chatPane(secondary.id === selected.id ? sessions.find(session => session.id === 'nested') : secondary, true) : ''}</div>`;
		updateMotion();
	}

	function updateMotion() {
		const hidden = !!host.closest('[hidden]') || document.hidden;
		host.classList.toggle('mp-motion-paused', paused || hidden || !visible);
		host.classList.toggle('mp-reduced', reduced);
	}
	let visible = false;
	const visibilityObserver = new IntersectionObserver(entries => {
		visible = entries[0].isIntersecting;
		updateMotion();
	});
	visibilityObserver.observe(host);
	const panelObserver = new MutationObserver(updateMotion);
	for (const panel of [host.closest('[role="tabpanel"]'), host.closest('[data-view-panel]')]) {
		panelObserver.observe(panel, { attributes: true, attributeFilter: ['hidden'] });
	}
	document.addEventListener('visibilitychange', updateMotion);

	const viewport = host.querySelector('.mp-viewport');
	function fitPrototype() {
		if (!host.clientWidth) {
			return;
		}
		const availableHeight = Math.max(1, window.innerHeight - Math.max(0, viewport.getBoundingClientRect().top) - 24);
		const hostStyle = getComputedStyle(host);
		const availableWidth = host.clientWidth - parseFloat(hostStyle.paddingLeft) - parseFloat(hostStyle.paddingRight);
		const canvas = host.querySelector('.mp-workbench');
		const canvasHeight = canvas.offsetHeight;
		const scale = Math.min(1, availableHeight / canvasHeight, (availableWidth - 2) / canvas.offsetWidth);
		host.style.setProperty('--mp-scale', scale);
		host.style.setProperty('--mp-fit-width', `${canvas.offsetWidth * scale + 2}px`);
		host.style.setProperty('--mp-fit-height', `${canvasHeight * scale + 2}px`);
	}
	const sizeObserver = new ResizeObserver(fitPrototype);
	sizeObserver.observe(host);
	window.addEventListener('resize', fitPrototype);
	document.addEventListener('fullscreenchange', fitPrototype);

	host.addEventListener('click', async event => {
		const button = event.target.closest('button');
		if (!button) {
			return;
		}
		if (button.hasAttribute('data-mp-select')) {
			selectedId = button.dataset.mpSelect;
			render();
			host.querySelector(`[data-mp-select="${selectedId}"]`).focus({ preventScroll: true });
		} else if (button.hasAttribute('data-mp-collapse')) {
			const id = button.dataset.mpCollapse;
			if (collapsed.has(id)) { collapsed.delete(id); } else { collapsed.add(id); }
			render();
			host.querySelector(`[data-mp-collapse="${id}"]`).focus({ preventScroll: true });
		} else if (button.hasAttribute('data-mp-pause')) {
			paused = !paused;
			button.textContent = paused ? 'Resume motion' : 'Pause motion';
			button.setAttribute('aria-pressed', String(paused));
			updateMotion();
		} else if (button.hasAttribute('data-mp-reset')) {
			reset();
			announce('Baseline reset. All initial session states restored.');
		} else if (button.hasAttribute('data-mp-fullscreen')) {
			try {
				if (document.fullscreenElement) { await document.exitFullscreen(); } else { await host.requestFullscreen(); }
			} catch (error) {
				console.error('Could not open the motion prototype full screen.', error);
				announce('Full screen is unavailable in this browser. Expand the browser window instead.');
			}
		} else {
			const id = button.dataset.mpAllow ?? button.dataset.mpAnswer ?? button.dataset.mpRetry ?? button.dataset.mpStop;
			if (!id) {
				return;
			}
			const session = sessions.find(candidate => candidate.id === id);
			session.status = button.hasAttribute('data-mp-stop') ? 'complete' : 'working';
			session.detail = session.status === 'working' ? 'Reviewing the next step' : 'Stopped · result ready';
			selectedId = id;
			render();
			host.querySelector('.mp-chat-header').scrollIntoView({ block: 'nearest' });
			host.querySelector('.mp-transcript').focus({ preventScroll: true });
			announce(`${session.title}: ${statusNames[session.status]}. Simulation only.`);
		}
	});
	host.addEventListener('change', event => {
		if (event.target.matches('[data-mp-layout]')) {
			layout = event.target.value;
			render();
		} else if (event.target.matches('[data-mp-reduced]')) {
			reduced = event.target.checked;
			updateMotion();
		}
	});
	host.addEventListener('submit', event => {
		if (!event.target.matches('[data-mp-form]')) {
			return;
		}
		event.preventDefault();
		const textarea = event.target.querySelector('textarea');
		if (!textarea.value.trim()) {
			textarea.setCustomValidity('Enter a prompt to start simulated work.');
			textarea.reportValidity();
			return;
		}
		const session = sessions.find(candidate => candidate.id === event.target.dataset.mpForm);
		session.prompt = textarea.value.trim();
		session.status = 'working';
		session.detail = 'Working on your request';
		selectedId = session.id;
		render();
		host.querySelector('.mp-transcript').focus({ preventScroll: true });
		announce('Simulated work started. No real agent request was sent.');
	});
	host.addEventListener('input', event => {
		if (event.target.matches('textarea')) {
			event.target.setCustomValidity('');
		}
	});
	host.addEventListener('keydown', event => {
		const tab = event.target.closest('.mp-chat-tabs [role="tab"]');
		if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
			return;
		}
		event.preventDefault();
		const tabs = [...host.querySelectorAll('.mp-chat-tabs [role="tab"]')];
		const index = tabs.indexOf(tab);
		const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
		selectedId = tabs[next].dataset.mpSelect;
		render();
		host.querySelector(`.mp-chat-tabs [data-mp-select="${selectedId}"]`).focus();
	});
	reset();
})();
