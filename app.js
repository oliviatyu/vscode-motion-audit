const STORAGE_KEY = 'vscode-motion-audit-v5';
const SIDEBAR_WIDTH_STORAGE_KEY = 'vscode-motion-audit-sidebar-width';
const COMPONENT_EXPLORER_INPUTS_KEY = 'component-explorer:inputValues';
const ENABLE_ANIMATIONS_INPUT_KEY = 'enableAnimations\u0000{"default":false,"description":"Enable CSS animations and transitions.","type":"boolean"}';
const DEFAULT_SIDEBAR_WIDTH = 268;
const MIN_SIDEBAR_WIDTH = 180;
const MAX_SIDEBAR_WIDTH = 480;
const MIN_CONTENT_WIDTH = 480;
const SIDEBAR_KEYBOARD_STEP = 16;
const isPublicBuild = window.__MOTION_AUDIT_PUBLIC__ === true;
const animatedFixtureCount = 75;
const visuallyVerifiedFixtureCount = 18;
const componentExplorerUrl = `${window.location.origin}/___explorer`;

const categories = [
	{
		id: 'confirm-action',
		name: 'Confirm a user action',
		description: 'Shows that VS Code received something the user did.',
		question: 'After the user acts, does the interface respond immediately and clearly?',
		examples: ['ConfirmationAccepted', 'PlanApproved', 'QuestionAnswered']
	},
	{
		id: 'explain-layout',
		name: 'Explain a layout change',
		description: 'Helps users follow content as it opens, closes, moves, or changes size.',
		question: 'Can users follow the content from its old state to its new state?',
		examples: ['CollapseTransition', 'ExpandedReasoning', 'StandaloneToolDetailsExpanded']
	},
	{
		id: 'ongoing-work',
		name: 'Show ongoing work',
		description: 'Reassures users that an operation is still active when completion time is unknown.',
		question: 'Is ongoing activity clear without creating competing or tiring movement?',
		examples: ['Draw', 'PixelSpinner', 'SharedItemSpacing', 'ActivityUpdates']
	},
	{
		id: 'phase-progress',
		name: 'Show a new stage of work',
		description: 'Explains that the type of work changed, not only that work continues.',
		question: 'Can users understand that the work entered a meaningfully different stage?',
		examples: ['ThinkingToMarkdown', 'ToolsToMarkdown', 'GlyphRevealFinal']
	},
	{
		id: 'time-running-out',
		name: 'Show time running out',
		description: 'Communicates that an action is available for a limited amount of time.',
		question: 'Is the remaining time accurate and still understandable without movement?',
		examples: ['BulkDoneNotificationAnimated']
	},
	{
		id: 'needs-user',
		name: 'Request user attention',
		description: 'Makes it clear that VS Code needs a response before work can continue.',
		question: 'Is the required action the clearest thing on screen?',
		examples: ['ToolConfirmation', 'AskQuestions', 'PlanReview']
	},
	{
		id: 'completion-delight',
		name: 'Confirm completion or add delight',
		description: 'Marks success, reinforces identity, or makes an important result feel satisfying.',
		question: 'What meaningful completion makes this special motion worth using?',
		examples: ['GlyphRevealFinal', 'CompletedSubagentNotices', 'Draw']
	}
];

const currentFindings = [
	{
		finding: 'Motion feels heavier when it repeats or appears in several places.',
		evidenceIds: ['working-logo', 'progress-shimmer', 'pixel-spinner', 'image-generation-lifecycle'],
		scenarioIds: ['running-terminal-tool', 'updating-multi-diff', 'agent-with-details-loading', 'create-pull-request-generation'],
		whyItMatters: 'Two spinners next to related fields are easy to understand. Six or seven signals spread across Sessions, Chat, and Details are harder to follow, especially when several signals say the same thing.',
		checkNext: 'Identify which motions add new information. Remove repeated signals and limit how many areas move at once.'
	},
	{
		finding: 'It is not always clear what each motion is showing.',
		evidenceIds: ['working-logo', 'progress-shimmer', 'pixel-spinner', 'auto-routing-shimmer'],
		scenarioIds: ['single-live-session', 'streaming-response', 'running-terminal-tool', 'create-pull-request-generation'],
		whyItMatters: 'A drawing, shimmer, dots, animated border, or spinner can all mean “still working.” Users may not know whether the whole session, one response, one tool, or one field is still running.',
		checkNext: 'Use one clear pattern for session progress, one for local progress, and one for special long-running work.'
	},
	{
		finding: 'Reduced Motion does not behave the same everywhere.',
		evidenceIds: ['pixel-spinner', 'auto-routing-shimmer', 'image-generation-lifecycle', 'session-countdown', 'rename-scroll'],
		whyItMatters: 'Some motion stops, but some keeps spinning, changing text, or scrolling. Turning on Reduced Motion should give users a consistent result.',
		checkNext: 'Make all components use the same Reduced Motion behavior, then test that each one still communicates status without moving.'
	}
];

const overlapPanels = [
	{ id: 'sessions-list', name: 'Sessions list' },
	{ id: 'session-chat', name: 'Session / Chat' },
	{ id: 'editor', name: 'Editor' },
	{ id: 'details', name: 'Details' },
	{ id: 'panel-terminal', name: 'Panel / Terminal' }
];

const coordinationValidationBaseline = {
	product: 'VS Code Insiders 1.142.0',
	commit: 'ff00e78',
	checkedOn: 'October 12, 2026',
	settings: 'Persistent progress: Draw · Progress border: On · Reduced motion: Off · Terminal tab animations: On'
};

const overlapScenarios = [
	{
		id: 'single-live-session',
		title: 'One repository session runs',
		verification: 'production',
		phases: ['Request', 'Working', 'Stops'],
		observation: 'A live Insiders capture confirms four simultaneous signals across the Sessions list and Session / Chat. Editor, Details, and Panel / Terminal remain still.',
		recording: {
			src: 'assets/live-insiders/one-repository-session.mp4',
			poster: 'assets/live-insiders/one-repository-session-poster.jpg',
			label: 'VS Code Insiders · 4 second loop',
			description: 'Four-second silent recording of a repository session running in VS Code Insiders. Motion appears in the Sessions list and Session / Chat while Editor, Details, and Terminal stay still.'
		},
		motions: [
			{ panel: 'sessions-list', label: 'Session PixelSpinner', start: 0, end: 88 },
			{ panel: 'session-chat', label: 'Header PixelSpinner', start: 0, end: 88 },
			{ panel: 'session-chat', label: 'Working logo', start: 0, end: 88 },
			{ panel: 'session-chat', label: 'Input working border', start: 0, end: 88 }
		]
	},
	{
		id: 'streaming-response',
		title: 'Streaming a response',
		verification: 'production',
		phases: ['Request', 'Streaming', 'Complete'],
		observation: 'A live Agents Window capture confirms response text appearing and growing while the working status, logo, and composer border remain active. All progress motion stops when the request completes.',
		recording: {
			src: 'assets/input-working-border-production.mp4',
			poster: 'assets/live-insiders/streaming-response-poster.jpg',
			label: 'VS Code Insiders · 7 second capture',
			description: 'A live Agents Window recording showing response text streaming into the transcript while the working status, working logo, and animated composer border remain active.'
		},
		motions: [
			{ panel: 'session-chat', label: 'Streamed response growth', start: 8, end: 92 },
			{ panel: 'session-chat', label: 'Status phrase shimmer', start: 0, end: 92 },
			{ panel: 'session-chat', label: 'Working logo', start: 0, end: 92 },
			{ panel: 'session-chat', label: 'Input working border', start: 0, end: 92 }
		]
	},
	{
		id: 'generating-image',
		title: 'Generating an image',
		verification: 'confirmed',
		phases: ['Start', 'Generating', 'Reveal'],
		observation: 'Native image generation is a provider-gated product behavior. This full-shell component capture confirms the glyph wave, rotating phrases, and image reveal; a signed-in ChatGPT-backed OpenAI session is required for a live provider capture.',
		recording: {
			src: 'assets/generated-image-lifecycle-production.mp4',
			poster: 'assets/live-insiders/generated-image-lifecycle-poster.jpg',
			kicker: 'Component fixture capture',
			label: 'Code OSS · 18 second lifecycle',
			description: 'A full Code OSS component-fixture recording showing the generated-image glyph wave, changing status phrases, and final image reveal. It confirms the shipped UI lifecycle, not provider availability.'
		},
		motions: [
			{ panel: 'session-chat', label: 'Generated-image glyph wave', start: 0, end: 82 },
			{ panel: 'session-chat', label: 'Status phrase changes', start: 12, end: 82 },
			{ panel: 'session-chat', label: 'Image reveal', start: 82, end: 100 }
		]
	},
	{
		id: 'running-terminal-tool',
		title: 'Agent runs a terminal command',
		verification: 'production',
		phases: ['Approval', 'Command running', 'Complete'],
		observation: 'A live Agents Window capture confirms the inline terminal command, its PixelSpinner, surrounding request progress, and composer border. This does not exercise the separate Terminal panel.',
		recording: {
			src: 'assets/local-tool-pixel-spinner-production.mp4',
			poster: 'assets/live-insiders/local-tool-pixel-spinner-poster.jpg',
			label: 'VS Code Insiders · 10 second capture',
			description: 'A live Agents Window recording showing an agent-owned terminal command running inline in Chat alongside the session, header, working, and composer progress signals.'
		},
		motions: [
			{ panel: 'sessions-list', label: 'Session PixelSpinner', start: 0, end: 88 },
			{ panel: 'session-chat', label: 'Header PixelSpinner', start: 0, end: 88 },
			{ panel: 'session-chat', label: 'Terminal command PixelSpinner', start: 8, end: 82 },
			{ panel: 'session-chat', label: 'Tool status shimmer', start: 8, end: 82 },
			{ panel: 'session-chat', label: 'Working logo', start: 0, end: 88 },
			{ panel: 'session-chat', label: 'Input working border', start: 0, end: 88 }
		]
	},
	{
		id: 'updating-multi-diff',
		title: 'Editing while multi-diff is open',
		verification: 'production',
		phases: ['2 files', '3 files', 'Active'],
		observation: 'A live Agents Window capture confirms that package.json appears as a third file in the open Changes editor while the session remains active. The Changes update is a content refresh, not a separate editor animation.',
		recording: {
			src: 'assets/live-insiders/editing-while-multidiff-open.mp4',
			poster: 'assets/live-insiders/editing-while-multidiff-open-poster.jpg',
			label: 'VS Code Insiders · 18 second capture',
			description: 'A live Agents Window recording showing package.json appear as a third changed file while the session, Chat progress, subagent status, and composer border remain active.'
		},
		motions: [
			{ panel: 'sessions-list', label: 'Session working indicator', start: 0, end: 100 },
			{ panel: 'session-chat', label: 'Header working indicator', start: 0, end: 100 },
			{ panel: 'session-chat', label: 'First-pass PixelSpinner', start: 0, end: 100 },
			{ panel: 'session-chat', label: 'Subagent running indicator', start: 0, end: 100 },
			{ panel: 'session-chat', label: 'Input working border', start: 0, end: 100 },
			{ panel: 'details', label: '+1 file', start: 54, end: 66 }
		]
	},
	{
		id: 'waiting-for-confirmation',
		title: 'Waiting for user confirmation',
		verification: 'production',
		phases: ['Work', 'Needs input', 'Approved'],
		observation: 'A live Agents Window capture confirms that pending confirmation uses a distinct Needs Input treatment. The product shows the request in the Sessions list and inline Chat with an Allow action while normal response shimmer and working-logo motion stop.',
		recording: {
			src: 'assets/live-insiders/waiting-for-user-confirmation.mp4',
			poster: 'assets/live-insiders/waiting-for-user-confirmation-poster.jpg',
			label: 'VS Code Insiders · 7 second capture',
			description: 'A live Agents Window recording showing the same pending write confirmation in the Sessions list and inline Chat, while response-level shimmer and working-logo motion remain absent.'
		},
		motions: [
			{ panel: 'sessions-list', label: 'Needs-input pulse', start: 8, end: 100 },
			{ panel: 'sessions-list', label: 'Needs-input ring PixelSpinner', start: 8, end: 100 },
			{ panel: 'session-chat', label: 'Header needs-input ring', start: 8, end: 100 }
		]
	},
	{
		id: 'needs-input-while-running',
		title: 'One session needs input while another runs',
		verification: 'production',
		phases: ['Session A blocks', 'Session B runs', 'Input supplied'],
		observation: 'A live Agents Window capture confirms one session waiting for terminal approval while another session continues active work. The two status treatments remain visually distinct.',
		recording: {
			src: 'assets/chat-progress-text-shimmer-production.mp4',
			poster: 'assets/live-insiders/chat-progress-text-shimmer-poster.jpg',
			label: 'VS Code Insiders · 6 second capture',
			description: 'A live Agents Window recording showing an inactive session waiting for terminal approval while the selected image request continues running with its own session, header, working, and composer progress.'
		},
		motions: [
			{ panel: 'sessions-list', label: 'Needs-input pulse', start: 0, end: 100 },
			{ panel: 'sessions-list', label: 'Needs-input ring PixelSpinner', start: 0, end: 100 },
			{ panel: 'sessions-list', label: 'Running-session PixelSpinner', start: 16, end: 100 },
			{ panel: 'sessions-list', label: 'Running-session title shimmer', start: 16, end: 100 },
			{ panel: 'session-chat', label: 'Active header PixelSpinner', start: 16, end: 100 },
			{ panel: 'session-chat', label: 'Working logo', start: 16, end: 100 },
			{ panel: 'session-chat', label: 'Input working border', start: 16, end: 100 }
		]
	},
	{
		id: 'bulk-completion-while-running',
		title: 'Bulk completion while another session runs',
		verification: 'confirmed',
		phases: ['Bulk action', 'Countdown', 'Expires'],
		observation: 'A shipped component fixture confirms the bulk-completion countdown and an in-progress session spinner in the same Sessions list. This validates the product components and placement without claiming a live provider run.',
		recording: {
			src: 'assets/live-insiders/bulk-completion-while-running.mp4',
			poster: 'assets/live-insiders/bulk-completion-while-running-poster.jpg',
			kicker: 'Component fixture capture',
			label: 'Code OSS · 10 second capture',
			description: 'A Code OSS component-fixture recording showing the “3 marked done” countdown while another session remains in progress in the Sessions list.'
		},
		motions: [
			{ panel: 'sessions-list', label: 'Bulk notification countdown', start: 0, end: 100 },
			{ panel: 'sessions-list', label: 'Running-session PixelSpinner', start: 0, end: 100 }
		]
	},
	{
		id: 'agent-with-details-loading',
		title: 'Agent works while Details loads changes',
		verification: 'production',
		phases: ['Request', 'Loading', 'Changes'],
		observation: 'A live Agents Window capture confirms the session remains active while the selected Changes view continues loading and publishing resources in Details.',
		recording: {
			src: 'assets/live-insiders/agent-details-loading.mp4',
			poster: 'assets/live-insiders/agent-details-loading-poster.jpg',
			label: 'VS Code Insiders · 7 second capture',
			description: 'A live Agents Window recording showing active session and Chat progress while the Changes view remains open and loading in Details.'
		},
		motions: [
			{ panel: 'sessions-list', label: 'Session working indicator', start: 0, end: 100 },
			{ panel: 'session-chat', label: 'Header working indicator', start: 0, end: 100 },
			{ panel: 'session-chat', label: 'First-pass PixelSpinner', start: 0, end: 100 },
			{ panel: 'session-chat', label: 'Subagent running indicator', start: 0, end: 100 },
			{ panel: 'session-chat', label: 'Input working border', start: 0, end: 100 },
			{ panel: 'details', label: 'Changes loading progress bar', start: 0, end: 100 }
		]
	},
	{
		id: 'create-pull-request-generation',
		title: 'Create Pull Request fields generate',
		verification: 'confirmed',
		phases: ['Open', 'Generating', 'Ready'],
		observation: 'A shipped component fixture confirms separate loading spinners and aria-busy states for the Title and Description fields. This validates the product component without claiming live provider timing.',
		recording: {
			src: 'assets/live-insiders/create-pull-request-generation.mp4',
			poster: 'assets/live-insiders/create-pull-request-generation-poster.jpg',
			kicker: 'Component fixture capture',
			label: 'Code OSS · 7 second capture',
			description: 'A Code OSS component-fixture recording showing the Create Pull Request Title and Description fields generating simultaneously.'
		},
		motions: [
			{ panel: 'details', label: 'Title loading spinner', start: 0, end: 92 },
			{ panel: 'details', label: 'Description loading spinner', start: 0, end: 92 }
		]
	},
	{
		id: 'two-visible-sessions',
		title: 'Two visible sessions run at once',
		verification: 'production',
		phases: ['Session A', 'Both run', 'Session B'],
		observation: 'A live Insiders capture confirms multiple independently animated status rows in the Sessions list. The recording is intentionally list-only, so the timeline does not infer unrecorded Chat motion.',
		recording: {
			src: 'assets/live-insiders/two-visible-sessions.mp4',
			poster: 'assets/live-insiders/two-visible-sessions-poster.jpg',
			label: 'VS Code Insiders · 8 second capture',
			description: 'A cropped live VS Code Insiders recording showing independently animated status indicators on multiple simultaneously visible session rows.'
		},
		motions: [
			{ panel: 'sessions-list', label: 'Session A PixelSpinner', start: 0, end: 100 },
			{ panel: 'sessions-list', label: 'Session B PixelSpinner', start: 0, end: 100 },
			{ panel: 'sessions-list', label: 'Session title shimmer', start: 0, end: 100 }
		]
	}
];

const motionCoverage = [
	{
		surface: 'Sessions list',
		motion: 'Session PixelSpinner',
		trigger: 'A session or nested chat is active, including while it waits for input',
		implementation: 'JavaScript PixelSpinner; grid for in progress, ring for needs input',
		sourcePath: 'vs/sessions/browser/sessionStatusIcon.ts',
		fixture: 'State fixture; spinner not exercised',
		production: 'Confirmed',
		overlap: 'Primary session-level activity signal'
	},
	{
		surface: 'Sessions list',
		motion: 'Session title shimmer',
		trigger: 'An unselected session is in progress',
		implementation: 'CSS keyframes',
		sourcePath: 'vs/sessions/contrib/sessions/browser/media/sessionsList.css',
		fixture: 'Exercised; not tagged Animated',
		production: 'Confirmed',
		overlap: 'Can run with the session spinner and active Chat'
	},
	{
		surface: 'Sessions list',
		motion: 'Needs-input pulse',
		trigger: 'A session is blocked on a user decision',
		implementation: 'CSS keyframes',
		sourcePath: 'vs/sessions/contrib/sessions/browser/media/sessionsList.css',
		fixture: 'State fixture; motion not tagged',
		production: 'Source-backed',
		overlap: 'Runs alongside the needs-input ring PixelSpinner and can coexist with another running session'
	},
	{
		surface: 'Sessions list',
		motion: 'Bulk-action countdown',
		trigger: 'Undoable bulk action notification is visible',
		implementation: 'CSS keyframes',
		sourcePath: 'vs/sessions/contrib/sessions/browser/media/sessionsListNotification.css',
		fixture: 'Exercised and tagged Animated',
		production: 'Needs verification',
		overlap: 'Can coexist with active sessions'
	},
	{
		surface: 'Sessions list',
		motion: 'Blocked-session title-bar blink',
		trigger: 'A newly blocked session requests attention',
		implementation: 'CSS keyframes restarted by JavaScript',
		sourcePath: 'vs/sessions/contrib/sessions/browser/media/blockedSessionsList.css',
		fixture: 'State fixtures; motion not tagged',
		production: 'Needs verification',
		overlap: 'Short attention signal above persistent needs-input motion'
	},
	{
		surface: 'Session / Chat',
		motion: 'Status phrase shimmer',
		trigger: 'Thinking or progress content is incomplete',
		implementation: 'CSS keyframes',
		sourcePath: 'vs/workbench/contrib/chat/browser/widget/media/chat.css',
		fixture: 'Exercised and tagged Animated',
		production: 'Confirmed',
		overlap: 'Frequently overlaps local activity and input-border motion'
	},
	{
		surface: 'Session / Chat',
		motion: 'Input working border',
		trigger: 'A request is in progress and progress-border motion is enabled',
		implementation: 'CSS pseudo-element keyframes toggled by ChatWidget',
		sourcePath: 'vs/workbench/contrib/chat/browser/widget/chatWidget.ts',
		fixture: 'Missing working state',
		production: 'Confirmed',
		overlap: 'Persistent response-level signal around the composer'
	},
	{
		surface: 'Session / Chat',
		motion: 'Working logo',
		trigger: 'Response-level work is active',
		implementation: 'JavaScript requestAnimationFrame',
		sourcePath: 'vs/workbench/contrib/chat/browser/widget/chatWorkingLogo.ts',
		fixture: 'Exercised and tagged Animated',
		production: 'Confirmed',
		overlap: 'Can repeat the same meaning as shimmer and border'
	},
	{
		surface: 'Session / Chat',
		motion: 'Terminal-command or subagent PixelSpinner',
		trigger: 'An inline terminal command or subagent is running or waiting',
		implementation: 'JavaScript PixelSpinner',
		sourcePath: 'vs/base/browser/ui/pixelSpinner/pixelSpinner.ts',
		fixture: 'Exercised in terminal and subagent fixtures',
		production: 'Confirmed',
		overlap: 'One instance per active terminal command or subagent'
	},
	{
		surface: 'Session / Chat',
		motion: 'Generic tool progress spinner',
		trigger: 'A generic or MCP tool has not produced output or an error',
		implementation: 'Spinning loading Codicon',
		sourcePath: 'vs/workbench/contrib/chat/browser/widget/chatContentParts/chatToolInputOutputContentPart.ts',
		fixture: 'Exercised in tool fixtures; icon motion not tagged',
		production: 'Needs verification',
		overlap: 'Distinct implementation from terminal-command and subagent PixelSpinners'
	},
	{
		surface: 'Session / Chat',
		motion: 'Atomic edit highlight',
		trigger: 'A file edit is applied to the changes summary',
		implementation: 'CSS keyframes',
		sourcePath: 'vs/workbench/contrib/chat/browser/widget/media/chat.css',
		fixture: 'Patch-completion fixture is tagged Animated',
		production: 'Needs verification',
		overlap: 'Short confirmation layered onto ongoing work'
	},
	{
		surface: 'Session / Chat',
		motion: 'Generated-image lifecycle',
		trigger: 'Image generation starts and later returns image bytes',
		implementation: 'Changing status copy, animated glyph surface, and finite image reveal',
		sourcePath: 'vs/workbench/contrib/chat/browser/attachments/chatImageGlyphSurface.ts and chatImageReveal.ts',
		fixture: 'Exercised and tagged Animated',
		production: 'Confirmed in a continuous Code OSS Component Explorer recording',
		overlap: 'One specialized progress-to-completion sequence'
	},
	{
		surface: 'Session / Chat',
		motion: 'Voice connecting spinner',
		trigger: 'Voice mode is connecting',
		implementation: 'Spinning Codicon',
		sourcePath: 'vs/workbench/contrib/chat/browser/voiceInputMode/media/voiceInputMode.css',
		fixture: 'Exercised; not tagged Animated',
		production: 'Needs verification',
		overlap: 'Mutually exclusive with an active request'
	},
	{
		surface: 'Session / Chat',
		motion: 'Voice listening and speaking visualization',
		trigger: 'Voice mode is listening or speaking',
		implementation: 'CSS and requestAnimationFrame',
		sourcePath: 'vs/workbench/contrib/chat/browser/voiceInputMode/voiceInputModeActionViewItem.ts',
		fixture: 'State fixtures; runtime motion not detected',
		production: 'Needs verification',
		overlap: 'Voice-specific; not an agent-work overlap'
	},
	{
		surface: 'Session / Chat',
		motion: 'Dictation glow and download ring',
		trigger: 'Dictation is recording or downloading a model',
		implementation: 'CSS keyframes',
		sourcePath: 'vs/workbench/contrib/chat/browser/speechToText/media/dictationMicGlow.css',
		fixture: 'State fixtures; not tagged Animated',
		production: 'Needs verification',
		overlap: 'Input-mode motion rather than response progress'
	},
	{
		surface: 'Session / Chat',
		motion: 'Chat pet ambient and completion motion',
		trigger: 'Chat pet is enabled and changes state',
		implementation: 'CSS and sprite-frame animation',
		sourcePath: 'vs/workbench/contrib/chat/browser/widget/media/chatPet.css',
		fixture: 'Rig and static state fixtures',
		production: 'Needs verification',
		overlap: 'Optional ambient motion can coexist with progress'
	},
	{
		surface: 'Editor',
		motion: 'Multi-diff loading progress',
		trigger: 'A multi-diff editor waits for document models',
		implementation: 'Editor progress service',
		sourcePath: 'vs/workbench/contrib/multiDiffEditor/browser/multiDiffEditor.ts',
		fixture: 'Animated synthetic-loading fixtures',
		production: 'No distinct motion observed',
		overlap: 'Editor lane checked during agent edits'
	},
	{
		surface: 'Editor',
		motion: 'Inline-edit blink and reveal',
		trigger: 'An inline edit appears or changes visibility',
		implementation: 'CSS keyframes and transitions',
		sourcePath: 'vs/editor/contrib/inlineCompletions/browser/view/inlineEdits/view.css',
		fixture: 'State fixtures; motion not audited',
		production: 'Needs verification',
		overlap: 'Can coexist with a background session'
	},
	{
		surface: 'Editor',
		motion: 'Editor message and CodeLens fade',
		trigger: 'Transient editor UI appears or disappears',
		implementation: 'CSS keyframes',
		sourcePath: 'vs/editor/contrib/message/browser/messageController.css',
		fixture: 'Not represented as overlap fixtures',
		production: 'Source-backed',
		overlap: 'Brief user-driven motion, not agent-specific'
	},
	{
		surface: 'Details',
		motion: 'Changes loading progress bar',
		trigger: 'The active session changeset is loading',
		implementation: 'Infinite ProgressBar',
		sourcePath: 'vs/sessions/contrib/changes/browser/changesView.ts',
		fixture: 'Fixture forces loading off',
		production: 'Needs verification',
		overlap: 'Can run beside active Chat and Sessions list motion'
	},
	{
		surface: 'Details',
		motion: 'Pull-request field spinners',
		trigger: 'Pull-request title and description are generated',
		implementation: 'Spinning Codicons',
		sourcePath: 'vs/sessions/contrib/changes/browser/createPullRequestWidget.ts',
		fixture: 'Exercised; not tagged Animated',
		production: 'Needs verification',
		overlap: 'Two separately rendered indicators share one loading state and run together'
	},
	{
		surface: 'Details',
		motion: 'Pull-request submission spinner',
		trigger: 'Create Pull Request is submitting',
		implementation: 'Spinning Codicon in button label',
		sourcePath: 'vs/sessions/contrib/changes/browser/createPullRequestWidget.ts',
		fixture: 'Missing submitting state',
		production: 'Needs verification',
		overlap: 'Replaces field-generation motion'
	},
	{
		surface: 'Panel / Terminal',
		motion: 'Task status spinner',
		trigger: 'A VS Code task is active and terminal-tab animation is enabled',
		implementation: 'Spinning terminal status icon',
		sourcePath: 'vs/workbench/contrib/tasks/browser/taskTerminalStatus.ts',
		fixture: 'Missing',
		production: 'Needs verification',
		overlap: 'Distinct from inline Chat terminal-tool motion'
	},
	{
		surface: 'Panel / Terminal',
		motion: 'Shell-command or terminal-progress spinner',
		trigger: 'Terminal label templates expose an executing command or indeterminate progress',
		implementation: 'Spinning Codicon in terminal label',
		sourcePath: 'vs/workbench/contrib/terminal/browser/terminalInstance.ts',
		fixture: 'Missing',
		production: 'Not shown by ordinary command with default labels',
		overlap: 'Configuration-dependent Terminal-panel signal'
	},
	{
		surface: 'Panel / Terminal',
		motion: 'Terminal voice pulse',
		trigger: 'Terminal dictation is active',
		implementation: 'CSS keyframes',
		sourcePath: 'vs/workbench/contrib/terminal/browser/media/terminalVoice.css',
		fixture: 'Missing',
		production: 'Needs verification',
		overlap: 'Terminal input mode; not agent-specific'
	},
	{
		surface: 'Global / setup',
		motion: 'Policy-blocked progress',
		trigger: 'Sessions policy state is being resolved',
		implementation: 'CSS keyframes',
		sourcePath: 'vs/sessions/contrib/policyBlocked/browser/media/sessionsPolicyBlocked.css',
		fixture: 'Missing',
		production: 'Needs verification',
		overlap: 'Blocking setup state'
	},
	{
		surface: 'Global / optional',
		motion: 'Aquarium ambient motion',
		trigger: 'The optional Agents aquarium is visible',
		implementation: 'CSS keyframes',
		sourcePath: 'vs/sessions/contrib/aquarium/browser/media/aquarium.css',
		fixture: 'Missing',
		production: 'Needs verification',
		overlap: 'Ambient motion can coexist with every workflow'
	},
	{
		surface: 'Responsive layout',
		motion: 'Phone editor, panel, and auxiliary-bar entrances',
		trigger: 'A phone layout surface opens',
		implementation: 'CSS keyframes',
		sourcePath: 'vs/sessions/browser/media/phoneLayout.css',
		fixture: 'Missing',
		production: 'Needs mobile verification',
		overlap: 'Short orientation motion on mobile'
	}
];

const seededRecords = [
	{
		id: 'working-logo',
		name: 'ChatWorkingLogo',
		area: 'Chat',
		path: 'chat / logoMotion / chatWorkingLogo / Draw',
		source: 'Component animation',
		understanding: 'The agent is actively working.',
		category: 'ongoing-work',
		trigger: 'Response-level work is active',
		pattern: 'VS Code mark draws, holds, unravels, and rests',
		scope: 'Small icon',
		duration: '2.667 seconds per cycle',
		repetition: 'Continuous while active',
		nearby: 'Often appears with shimmering status text and local activity indicators',
		reducedMotion: 'Holds a static logo frame.',
		observations: 'The internal phases repeat independently of actual work phases.',
		question: 'Which single indicator should lead when response-level and local progress are both visible?'
	},
	{
		id: 'progress-shimmer',
		name: 'Progress text shimmer',
		area: 'Chat',
		path: 'chat / chatProgressContentPart / WithSpinner',
		source: 'Component animation',
		understanding: 'The displayed status is still active.',
		category: 'ongoing-work',
		trigger: 'Thinking, working, or progress content is incomplete',
		pattern: 'Horizontal highlight sweeps through text',
		scope: 'Status text',
		duration: '2 seconds per cycle',
		repetition: 'Continuous while active',
		nearby: 'Frequently paired with the animated working logo',
		reducedMotion: 'Displays solid text.',
		observations: 'Repeats the same ongoing-work message as the adjacent logo.',
		question: ''
	},
	{
		id: 'codicon-spinner',
		name: 'Legacy progress loading icon',
		area: 'Chat',
		path: 'chat / chatProgressContentPart / WithSpinner',
		source: 'Mixed',
		understanding: 'A local progress step is unfinished.',
		category: 'ongoing-work',
		trigger: 'A legacy progress row is incomplete',
		pattern: 'Static loading icon in the audited fixture; spin modifier is present',
		scope: 'Small icon',
		duration: 'No visible motion in Component Explorer',
		repetition: 'None observed',
		reducedMotion: 'Could not be evaluated because the fixture remained static with animations enabled.',
		observations: 'The production markup requests a spinning icon, but the representative fixture did not visibly rotate.',
		referenceState: 'Static fixture',
		question: ''
	},
	{
		id: 'pixel-spinner',
		name: 'PixelSpinner',
		area: 'Chat',
		path: 'chat / logoMotion / chatWorkingLogo / Performance / PixelSpinner',
		source: 'Component animation',
		understanding: 'A compact or terminal task is still active.',
		category: 'ongoing-work',
		trigger: 'Compact local activity begins',
		pattern: 'Six dots cascade downward',
		scope: 'Small icon',
		duration: '1.82 seconds per cycle',
		repetition: 'Continuous while active',
		nearby: 'Can remain visible beside response-level logo and shimmer',
		reducedMotion: 'Browser preference freezes it; the VS Code class-based preference does not.',
		observations: 'Useful as a local indicator, but can become a third simultaneous progress signal.',
		question: ''
	},
	{
		id: 'collapse-transition',
		name: 'CollapseTransition',
		area: 'Chat',
		path: 'chat / widget / chatWidget / PersistentProgress / Compact / CollapseTransition',
		source: 'Product state change',
		understanding: 'Detail changed into a summary or reopened.',
		category: 'explain-layout',
		trigger: 'Thinking or tool detail changes disclosure state',
		pattern: 'Height and opacity transition',
		scope: 'One response section',
		duration: '180 ms height; 140 ms opacity',
		repetition: 'Once per state change',
		reducedMotion: 'Transition is disabled.',
		observations: 'A finite transition with a clear orientation purpose.',
		question: ''
	},
	{
		id: 'progressive-content',
		name: 'Progressive response updates',
		area: 'Chat',
		path: 'chat / widget / chatWidget / PersistentProgress / ActivityUpdates',
		source: 'Product state change',
		understanding: 'New response work arrived in chronological order.',
		category: 'phase-progress',
		trigger: 'Provider progress events add rows, edits, or markdown',
		pattern: 'Content appears and reflows the response',
		scope: 'Response content',
		duration: 'Provider-driven',
		repetition: 'Finite per update; may continue through a response',
		reducedMotion: 'No dedicated interpolation is used.',
		observations: 'The visual rhythm is real, but fixture delays are synthetic.',
		question: ''
	},
	{
		id: 'auto-routing-shimmer',
		name: 'Auto routing shimmer',
		area: 'Chat',
		path: 'chat / chatAutoModeResolutionContentPart / Routing',
		source: 'Component animation',
		understanding: 'Model selection is unresolved.',
		category: 'ongoing-work',
		trigger: 'Auto routing has not resolved',
		pattern: 'Highlight sweeps through title text',
		scope: 'Status text',
		duration: '2 seconds per cycle',
		repetition: 'Continuous until resolved',
		reducedMotion: 'No matching override was found.',
		observations: 'Uses shimmer for another pending state without clarifying how it differs from response progress.',
		question: ''
	},
	{
		id: 'risk-spinner',
		name: 'Risk assessment loading icon',
		area: 'Chat',
		path: 'chat / chatToolRiskBadge / Loading',
		source: 'Mixed',
		understanding: 'Risk assessment is pending.',
		category: 'ongoing-work',
		trigger: 'Tool risk is being assessed',
		pattern: 'Static loading icon in the audited fixture; spin modifier is present',
		scope: 'Badge icon',
		duration: 'No visible motion in Component Explorer',
		repetition: 'None observed',
		reducedMotion: 'Could not be evaluated because the fixture remained static with animations enabled.',
		observations: 'The production markup requests a spinning icon, but the representative fixture did not visibly rotate.',
		referenceState: 'Static fixture',
		question: ''
	},
	{
		id: 'image-generation-lifecycle',
		name: 'Generated image lifecycle',
		area: 'Chat',
		path: 'chat / generatedImages / chatGeneratedImages / GlyphRevealFinal',
		source: 'Component animation and product state change',
		understanding: 'Image generation is active, then the completed result is revealed.',
		category: 'ongoing-work',
		trigger: 'An image tool starts generating and later returns image bytes',
		pattern: 'Status phrases change beneath a looping glyph surface, which expands and resolves into the final image',
		scope: 'Generated-image placeholder and result',
		duration: 'Phrases change every 4 seconds; glyphs loop while generating; reveal lasts approximately 4.5 seconds plus resize',
		repetition: 'Phrases and glyphs repeat while generating; reveal runs once per result',
		nearby: 'Working logo and other request-progress signals',
		reducedMotion: 'Glyphs freeze to a stable frame and the reveal is skipped; status copy continues changing.',
		observations: 'These are consecutive phases of one generated-image experience, not three independent motion patterns.',
		question: 'Does the full lifecycle communicate progress and completion clearly without stacking redundant activity signals?'
	},
	{
		id: 'session-countdown',
		name: 'BulkDoneNotificationAnimated',
		area: 'Sessions',
		path: 'sessions / sessionsListNotification / BulkDoneNotificationAnimated',
		source: 'Live product and component animation',
		understanding: 'The undo opportunity is running out.',
		category: 'time-running-out',
		trigger: 'A bulk action completes',
		pattern: 'Progress bar contracts from full width to zero',
		scope: 'Notification',
		duration: '10 seconds',
		repetition: 'Once per notice',
		reducedMotion: 'Changes to ten discrete steps instead of becoming static.',
		observations: 'Live Insiders validation confirmed that the width contracts continuously after Mark All as Done.',
		question: 'What non-moving treatment should communicate the remaining undo window?'
	},
	{
		id: 'find-widget-slide',
		name: 'Find widget reveal',
		area: 'Editor',
		path: 'editor / findWidget / Find',
		source: 'Component animation',
		understanding: 'Search controls entered the editor.',
		category: 'explain-layout',
		trigger: 'Find or Find and Replace opens',
		pattern: 'Overlay slides down into place',
		scope: 'Find overlay',
		duration: '200 ms',
		repetition: 'Once per show or hide',
		reducedMotion: 'Duration becomes zero.',
		observations: 'A finite transition with a clear orientation purpose.',
		question: ''
	},
	{
		id: 'rename-scroll',
		name: 'Rename viewport reveal',
		area: 'Editor',
		path: 'editor / renameWidget / RenameVariable',
		source: 'Mixed',
		understanding: 'The symbol being renamed is brought into view.',
		category: 'explain-layout',
		trigger: 'Rename opens with the symbol outside the viewport and smooth scrolling enabled',
		pattern: 'Editor viewport smoothly recenters',
		scope: 'Editor viewport',
		duration: 'Editor-controlled',
		repetition: 'Once per applicable invocation',
		reducedMotion: 'Controlled by smooth scrolling rather than directly by reduced motion.',
		observations: 'The labeled fixture does not exercise this production motion.',
		referenceState: 'Motion not exercised',
		question: ''
	},
	{
		id: 'multi-diff-incremental',
		name: 'Multi-diff incremental reveal',
		area: 'Editor',
		path: 'editor / multiDiffEditor / loading / IncrementalRealtime',
		source: 'Mixed',
		understanding: 'Resolved diff content is becoming available.',
		category: 'phase-progress',
		trigger: 'Initial diff resolution completes',
		pattern: 'Loading content is replaced in stages',
		scope: 'Multi-diff document',
		duration: 'Resolution-driven; fixture delays are synthetic',
		repetition: 'Finite per update',
		reducedMotion: 'No interpolation is used.',
		observations: 'The state change is abrupt and exact fixture timing is not product evidence.',
		question: 'Does the staged reveal make resolved and unresolved content clear enough without a transition?'
	},
	{
		id: 'multi-diff-document-swap',
		name: 'Multi-diff document swap',
		area: 'Editor',
		path: 'editor / multiDiffEditor / loading / DocumentSwapRealtime',
		source: 'Product state change',
		understanding: 'The compared document set changed.',
		category: 'phase-progress',
		trigger: 'The multi-diff source replaces its document list',
		pattern: 'Rows disappear and new rows appear atomically',
		scope: 'Multi-diff document list',
		duration: 'Resolution-driven',
		repetition: 'Once per source update',
		reducedMotion: 'No interpolation is used.',
		observations: 'The abrupt replacement can make renamed or reidentified documents difficult to follow.',
		referenceState: 'Synthetic timing',
		question: ''
	},
	{
		id: 'resize-observer-loop',
		name: 'ResizeObserver LoopContext',
		area: 'Fixture diagnostics',
		path: 'base / resizeObserver / resizeObserver / LoopContext',
		source: 'Fixture demonstration',
		understanding: 'A diagnostic fixture verifies resize-loop context.',
		category: 'confirm-action',
		trigger: 'The diagnostic fixture mounts',
		pattern: 'Probe element repeatedly grows by one pixel',
		scope: 'Fixture-only probe',
		duration: 'Until the browser warning occurs',
		repetition: 'Diagnostic loop',
		reducedMotion: 'Not applicable to production UI.',
		observations: 'This is not a production motion pattern.',
		referenceState: 'Fixture-only diagnostic',
		question: ''
	},
	{
		id: 'code-action-static',
		name: 'GroupedCodeActions',
		area: 'Editor',
		path: 'editor / codeActionList / GroupedCodeActions',
		source: 'No meaningful animation',
		understanding: 'The fixture is static despite its animated label.',
		category: 'confirm-action',
		trigger: 'The fixture opens',
		pattern: 'No exercised production motion',
		scope: 'Action list',
		duration: 'None',
		repetition: 'None',
		reducedMotion: 'Not applicable.',
		observations: 'The production controller does not opt into the generic dropdown animation.',
		referenceState: 'Static fixture',
		question: ''
	}
];

let records = loadRecords();
let currentView = 'findings';
let currentPage = 1;
let activePreviewId;
let toastTimer;
let activeResizePointerId;
const pageSize = 25;

const elements = {
	appShell: document.querySelector('.app-shell'),
	sidebarResizer: document.getElementById('sidebar-resizer'),
	navItems: [...document.querySelectorAll('.nav-item')],
	viewPanels: [...document.querySelectorAll('[data-view-panel]')],
	recordDialog: document.getElementById('record-dialog'),
	recordForm: document.getElementById('record-form'),
	deleteButton: document.getElementById('delete-record-button'),
	searchInput: document.getElementById('search-input'),
	categoryFilter: document.getElementById('category-filter'),
	sourceFilter: document.getElementById('source-filter'),
	inventoryBody: document.getElementById('inventory-body'),
	inventoryTableWrap: document.querySelector('#inventory-view .table-wrap'),
	emptyState: document.getElementById('empty-state'),
	filteredCount: document.getElementById('filtered-count'),
	categoryBody: document.getElementById('category-body'),
	findingsBody: document.getElementById('findings-body'),
	questionBoard: document.getElementById('question-board'),
	overlapBoard: document.getElementById('overlap-board'),
	motionCoverageMetrics: document.getElementById('motion-coverage-metrics'),
	motionCoverageBody: document.getElementById('motion-coverage-body'),
	toast: document.getElementById('toast'),
	inventoryPagination: document.getElementById('inventory-pagination'),
	previousPageButton: document.getElementById('previous-page-button'),
	nextPageButton: document.getElementById('next-page-button'),
	pageStatus: document.getElementById('page-status'),
	sessionTitleShimmerComparison: document.getElementById('session-title-shimmer-comparison'),
	sessionTitleShimmerButton: document.getElementById('play-session-title-shimmer'),
	sessionTitleShimmerStatus: document.getElementById('session-title-shimmer-status'),
	chatProgressShimmerComparison: document.getElementById('chat-progress-shimmer-comparison'),
	chatProgressShimmerButton: document.getElementById('play-chat-progress-shimmer'),
	chatProgressShimmerStatus: document.getElementById('chat-progress-shimmer-status'),
	chatWorkingLogoButton: document.getElementById('play-chat-working-logo'),
	chatWorkingLogoFrame: document.getElementById('chat-working-logo-frame'),
	chatWorkingLogoStatus: document.getElementById('chat-working-logo-status'),
	localToolSpinnerButton: document.getElementById('play-local-tool-spinner'),
	localToolSpinnerFrame: document.getElementById('local-tool-spinner-frame'),
	localToolSpinnerStatus: document.getElementById('local-tool-spinner-status'),
	inputWorkingBorderButton: document.getElementById('play-input-working-border'),
	inputWorkingBorderFrame: document.getElementById('input-working-border-frame'),
	inputWorkingBorderStatus: document.getElementById('input-working-border-status')
};

const liveMotionFramePlayers = [
	{
		button: elements.chatWorkingLogoButton,
		frame: elements.chatWorkingLogoFrame,
		status: elements.chatWorkingLogoStatus,
		path: './assets/live-insiders/chat-working-logo',
		frameName: 'frame',
		frameCount: 12,
		label: 'ChatWorkingLogo'
	},
	{
		button: elements.localToolSpinnerButton,
		frame: elements.localToolSpinnerFrame,
		status: elements.localToolSpinnerStatus,
		path: './assets/live-insiders/local-tool-spinner',
		frameName: 'context',
		frameCount: 8,
		label: 'Local tool PixelSpinner'
	},
	{
		button: elements.inputWorkingBorderButton,
		frame: elements.inputWorkingBorderFrame,
		status: elements.inputWorkingBorderStatus,
		path: './assets/live-insiders/input-working-border',
		frameName: 'frame',
		frameCount: 12,
		label: 'Input working border'
	}
];

const sourcePreviewCards = [
	{
		id: 'voice-state-indicators',
		name: 'Voice state indicators',
		description: 'Listening and speaking states use an audio-reactive ambient rim glow around the composer.',
		kind: 'voice',
		source: 'voiceGlow.css and voice state controls',
		productionVideo: './assets/voice-state-indicators-production.mp4',
		productionCaption: 'A live Agents Window recording showing the audio-reactive Voice Mode glow moving around the composer perimeter.',
		componentExplorer: [
			{ path: 'chat/voiceGlow/Voice glow (listening)', name: 'chat / voiceGlow / Voice glow (listening)' },
			{ path: 'chat/voiceGlow/Voice glow (speaking)', name: 'chat / voiceGlow / Voice glow (speaking)' }
		],
		impact: 'High within voice mode, but mostly mutually exclusive with the ordinary request-progress stack.'
	},
	{
		id: 'bulk-action-countdown',
		name: 'Bulk-action undo countdown',
		description: 'After a bulk Mark All as Done action, a progress bar contracts for ten seconds while Undo remains available.',
		kind: 'countdown',
		source: 'sessionsListNotification.css · countdown',
		productionVideo: './assets/bulk-action-undo-countdown-production.mp4',
		productionCaption: 'A live Agents Window recording showing the ten-second Undo countdown after Mark All as Done is confirmed for a session group.',
		componentExplorer: [{ path: 'sessions/sessionsListNotification/BulkDoneNotificationAnimated', name: 'sessions / sessionsListNotification / BulkDoneNotificationAnimated' }],
		impact: 'The motion represents real time pressure, so it has a stronger functional reason to lead than background progress loops.'
	},
	{
		id: 'generated-image-lifecycle',
		name: 'Generated-image lifecycle',
		description: 'Status phrases change beneath the looping glyph surface, then that same surface resolves into the completed image.',
		kind: 'image-glyph',
		source: 'Generated-image progress, glyph surface, and image reveal',
		productionVideo: './assets/generated-image-lifecycle-production.mp4',
		productionVideoType: 'video/mp4',
		productionCaption: 'A continuous Code OSS recording showing changing status phrases, the repeating glyph wave, and the one-shot transition into the generated image.',
		componentExplorer: [{ path: 'chat/generatedImages/chatGeneratedImages/GlyphRevealFinal', name: 'chat / generatedImages / chatGeneratedImages / GlyphRevealFinal' }],
		impact: 'This is one locally prominent progress-to-completion sequence, so its phrases, loop, and reveal should be evaluated as a coordinated system.'
	}
];

initialize();

function initialize() {
	restoreSidebarWidth();
	populateCategoryOptions();
	renderSourcePreviewCards();
	bindEvents();
	render();
}

function loadRecords() {
	const saved = localStorage.getItem(STORAGE_KEY);
	if (!saved) {
		return normalizeRecords(structuredClone(seededRecords));
	}

	try {
		const parsed = JSON.parse(saved);
		return Array.isArray(parsed) ? migrateGeneratedImageLifecycle(normalizeRecords(parsed)) : normalizeRecords(structuredClone(seededRecords));
	} catch {
		return normalizeRecords(structuredClone(seededRecords));
	}
}

function migrateGeneratedImageLifecycle(inputRecords) {
	const legacyIds = new Set(['image-generation-glyphs', 'image-reveal', 'image-generation-phrases']);
	const firstLegacyIndex = inputRecords.findIndex(record => legacyIds.has(record.id));
	if (firstLegacyIndex === -1) {
		return inputRecords;
	}

	const migratedRecords = inputRecords.filter(record => !legacyIds.has(record.id));
	if (!migratedRecords.some(record => record.id === 'image-generation-lifecycle')) {
		const lifecycleRecord = seededRecords.find(record => record.id === 'image-generation-lifecycle');
		migratedRecords.splice(Math.min(firstLegacyIndex, migratedRecords.length), 0, structuredClone(lifecycleRecord));
	}
	return migratedRecords;
}

function normalizeRecords(inputRecords) {
	return inputRecords.map(record => {
		const { status, ...normalizedRecord } = record;
		return normalizedRecord;
	});
}

function saveRecords() {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function populateCategoryOptions() {
	if (!elements.categoryFilter) {
		return;
	}
	const filterOptions = categories
		.map(category => `<option value="${escapeHtml(category.id)}">${escapeHtml(category.name)}</option>`)
		.join('');
	elements.categoryFilter.insertAdjacentHTML('beforeend', filterOptions);

	const recordCategory = document.getElementById('record-category');
	if (!recordCategory) {
		return;
	}
	recordCategory.innerHTML = [
		'<option value="">Choose a motion purpose</option>',
		...categories.map(category => `<option value="${escapeHtml(category.id)}">${escapeHtml(category.name)}</option>`)
	].join('');
}

function bindEvents() {
	elements.navItems.forEach(item => {
		item.addEventListener('click', () => switchView(item.dataset.view));
	});

	document.querySelectorAll('[data-go-to]').forEach(button => {
		button.addEventListener('click', () => switchView(button.dataset.goTo));
	});

	document.getElementById('close-record-dialog')?.addEventListener('click', closeRecordDialog);
	document.getElementById('cancel-record-button')?.addEventListener('click', closeRecordDialog);
	elements.deleteButton?.addEventListener('click', deleteCurrentRecord);
	elements.recordForm?.addEventListener('submit', saveRecordFromForm);

	[elements.searchInput, elements.categoryFilter, elements.sourceFilter].filter(Boolean).forEach(control => {
		control.addEventListener('input', () => {
			currentPage = 1;
			activePreviewId = undefined;
			renderInventory();
		});
	});

	document.getElementById('clear-filters-button')?.addEventListener('click', clearFilters);
	document.getElementById('empty-clear-button')?.addEventListener('click', clearFilters);
	elements.previousPageButton?.addEventListener('click', () => changePage(currentPage - 1));
	elements.nextPageButton?.addEventListener('click', () => changePage(currentPage + 1));
	document.getElementById('export-button').addEventListener('click', exportData);
	elements.sessionTitleShimmerButton.addEventListener('click', playSessionTitleShimmer);
	elements.chatProgressShimmerButton.addEventListener('click', playChatProgressShimmer);
	liveMotionFramePlayers.forEach(player => {
		player.frameIndex = 0;
		player.interval = undefined;
		player.button.addEventListener('click', () => toggleLiveMotionFramePlayer(player));
	});
	document.querySelectorAll('[data-source-preview-button]').forEach(button => {
		button.addEventListener('click', () => toggleSourcePreview(button));
	});
	preloadLiveMotionFrames();
	elements.sidebarResizer.addEventListener('pointerdown', beginSidebarResize);
	elements.sidebarResizer.addEventListener('pointermove', resizeSidebarFromPointer);
	elements.sidebarResizer.addEventListener('pointerup', endSidebarResize);
	elements.sidebarResizer.addEventListener('pointercancel', endSidebarResize);
	elements.sidebarResizer.addEventListener('keydown', resizeSidebarFromKeyboard);
	elements.sidebarResizer.addEventListener('dblclick', resetSidebarWidth);
	window.addEventListener('resize', clampSidebarToViewport);

}

function renderSourcePreviewCards() {
	const container = document.getElementById('source-preview-cards');
	container.innerHTML = sourcePreviewCards.map(item => `
		<article class="motion-component-comparison source-preview-card" id="${item.id}-comparison">
			<div class="motion-component-comparison-header">
				<div>
					<h4>${item.name}</h4>
					<p>${item.description}</p>
					${getComponentExplorerReferences(item.componentExplorer)}
				</div>
				${item.productionVideo ? '' : '<span class="source-preview-badge">Needs live confirmation</span>'}
			</div>
			<div class="motion-example-stack">
				<section class="motion-example-group motion-example-group-component" aria-labelledby="${item.id}-component-title">
					<div class="motion-example-group-heading motion-example-group-heading-action">
						<div>
							<p>Component being audited</p>
							<h5 id="${item.id}-component-title">${item.productionVideo ? 'Product behavior reference' : 'Source-based schematic'}</h5>
						</div>
						<button class="button button-primary" type="button" aria-pressed="false" data-source-preview-button>Play</button>
					</div>
					${getSourcePreviewVisual(item.kind, item.name)}
					<p class="source-preview-citation">${item.source}</p>
				</section>
				<section class="motion-example-group motion-example-group-scenario" aria-labelledby="${item.id}-scenario-title">
					<div class="motion-example-group-heading">
						<p>Production case</p>
						<h5 id="${item.id}-scenario-title">Screen recording</h5>
					</div>
					${getSourceProductionCase(item)}
				</section>
			</div>
			<div class="motion-component-evidence">
				<p><strong>Observed behavior:</strong> ${item.description}</p>
				<p><strong>Potential impact:</strong> ${item.impact}</p>
			</div>
			<p class="visually-hidden" aria-live="polite" data-source-preview-status></p>
		</article>
	`).join('');
}

function getSourceProductionCase(item) {
	if (!item.productionVideo) {
		return '<div class="motion-production-placeholder" role="img" aria-label="Empty production-case area reserved for a screen recording"><span>Screen recording placeholder</span></div>';
	}

	const captionId = `${item.id}-production-caption`;
	return `<figure class="live-motion-capture live-motion-capture-window">
		<video controls preload="metadata" playsinline aria-describedby="${captionId}">
			<source src="${item.productionVideo}" type="${item.productionVideoType ?? 'video/mp4'}">
			Your browser does not support embedded video.
		</video>
		<figcaption id="${captionId}">${item.productionCaption}</figcaption>
	</figure>`;
}

function getComponentExplorerReferences(references) {
	if (isPublicBuild) {
		return '';
	}
	if (!references.length) {
		return '<p class="component-explorer-reference"><span>Component Explorer</span><em>Not available</em></p>';
	}

	const label = references.some(reference => reference.closest) ? 'Closest Component Explorer fixture' : 'Component Explorer';
	const links = references.map(reference => {
		const url = `${componentExplorerUrl}?fixture=${encodeURIComponent(reference.path)}&search=${encodeURIComponent(reference.path.split('/').at(-1))}`;
		return `<a href="${url}" target="_blank" rel="noopener">${reference.name}</a>`;
	}).join('<span class="component-explorer-separator" aria-hidden="true">·</span>');
	return `<p class="component-explorer-reference"><span>${label}</span><span class="component-explorer-links">${links}</span></p>`;
}

function getSourcePreviewVisual(kind, name) {
	const visuals = {
		voice: '<div class="source-motion-stage source-motion-voice" role="img" aria-label="Voice Mode listening state with an animated ambient glow around the composer"><div class="source-voice-composer" aria-hidden="true"><span>Ask Copilot</span><i></i></div></div>',
		countdown: '<div class="source-motion-stage source-motion-countdown" role="img" aria-label="Undo notification with an animated ten-second countdown bar"><div><strong>1 marked done</strong><span>Undo</span></div><span><i></i></span></div>',
		'image-glyph': `<div class="source-motion-stage source-motion-image-glyph" role="img" aria-label="Generating image" aria-busy="true">
			<div class="source-image-glyph-content" aria-hidden="true">
				<div class="source-image-glyph-heading">
					<svg viewBox="0 0 12 12" focusable="false" aria-hidden="true">
						<path d="M3.33 9.07a.25.25 0 0 1 .35 0l2.59 2.59c-.29.2-.64.33-1.02.33h-3.5c-.38 0-.73-.12-1.02-.33l2.59-2.59h.01Z"></path>
						<path fill-rule="evenodd" d="M7.34 0c.39 0 .78.16 1.06.44l2.16 2.16c.28.28.44.67.44 1.06V9.5c0 .83-.67 1.5-1.5 1.5H7.88c.07-.24.12-.49.12-.75V10h1.5c.28 0 .5-.22.5-.5V4H8c-.55 0-1-.45-1-1V1H3.5c-.28 0-.5.22-.5.5V4H2V1.5C2 .67 2.67 0 3.5 0h3.84ZM8 3h1.54L8 1.46V3Z" clip-rule="evenodd"></path>
						<path fill-rule="evenodd" d="M5.26 5c.97 0 1.75.78 1.75 1.75v3.5c0 .22-.05.43-.12.62l-2.5-2.5a1.25 1.25 0 0 0-1.77 0l-2.5 2.5c-.08-.2-.12-.4-.12-.62v-3.5C0 5.78.78 5 1.75 5h3.51ZM5.25 6a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z" clip-rule="evenodd"></path>
					</svg>
					<span>Generating image</span>
				</div>
				<div class="source-image-glyph-band">
					<pre class="source-image-glyph-base">01101000011000010111000001110000
01111001010111110110001101101111
01100100011010010110111001100111
00100001011010000110000101110000
01110000011110010101111101100011</pre>
					<pre class="source-image-glyph-wave">···::===+++***##***+++===::·····
····::==+++**###**++++==:::····
···:::===+++***#***+++===::····
····::===++++*****+++==:::·····
···:::==+++***##***++++==::····</pre>
				</div>
			</div>
		</div>`,
		'image-reveal': '<div class="source-motion-stage source-motion-image-reveal" role="img" aria-label="Schematic generated image reveal"><div><span>Generated image</span><i></i></div></div>',
		'image-status': '<div class="source-motion-stage source-motion-image-status" role="img" aria-label="Schematic generated-image status phrases"><span>Preparing image…</span><span>Generating image…</span><span>Finishing image…</span></div>'
	};
	return visuals[kind] ?? `<div class="source-motion-stage" role="img" aria-label="${name} source-based schematic"></div>`;
}

function toggleSourcePreview(button) {
	const card = button.closest('.source-preview-card');
	const status = card.querySelector('[data-source-preview-status]');
	if (card.classList.contains('is-playing')) {
		card.classList.remove('is-playing');
		button.setAttribute('aria-pressed', 'false');
		button.textContent = 'Replay';
		status.textContent = 'Source-based motion preview paused.';
		return;
	}

	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
		status.textContent = 'Motion preview is disabled by the reduced-motion preference.';
		return;
	}

	card.classList.remove('is-playing');
	void card.offsetWidth;
	card.classList.add('is-playing');
	button.setAttribute('aria-pressed', 'true');
	button.textContent = 'Pause';
	status.textContent = 'Source-based motion preview playing. Live product confirmation is still required.';
}

function preloadLiveMotionFrames() {
	const preload = () => {
		liveMotionFramePlayers.forEach(player => {
			for (let index = 1; index < player.frameCount; index++) {
				const image = new Image();
				image.src = getLiveMotionFramePath(player, index);
			}
		});
	};

	if ('requestIdleCallback' in window) {
		window.requestIdleCallback(preload);
	} else {
		window.setTimeout(preload, 0);
	}
}

function getLiveMotionFramePath(player, index) {
	return `${player.path}/${player.frameName}-${String(index).padStart(2, '0')}.png`;
}

function toggleLiveMotionFramePlayer(player) {
	if (player.interval) {
		stopLiveMotionFramePlayer(player);
		return;
	}

	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
		player.status.textContent = 'Motion preview is disabled by the reduced-motion preference.';
		return;
	}

	player.frameIndex = 0;
	player.frame.src = getLiveMotionFramePath(player, player.frameIndex);
	player.button.setAttribute('aria-pressed', 'true');
	player.button.textContent = 'Pause';
	player.status.textContent = `${player.label} live capture playing.`;
	player.interval = window.setInterval(() => {
		player.frameIndex = (player.frameIndex + 1) % player.frameCount;
		player.frame.src = getLiveMotionFramePath(player, player.frameIndex);
	}, 140);
}

function stopLiveMotionFramePlayer(player) {
	window.clearInterval(player.interval);
	player.interval = undefined;
	player.button.setAttribute('aria-pressed', 'false');
	player.button.textContent = 'Replay';
	player.status.textContent = `${player.label} live capture paused.`;
}

function playSessionTitleShimmer() {
	if (elements.sessionTitleShimmerComparison.classList.contains('is-playing')) {
		stopSessionTitleShimmer();
		return;
	}

	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
		elements.sessionTitleShimmerStatus.textContent = 'Motion preview is disabled by the reduced-motion preference.';
		return;
	}

	void elements.sessionTitleShimmerComparison.offsetWidth;
	elements.sessionTitleShimmerComparison.classList.add('is-playing');
	elements.sessionTitleShimmerButton.setAttribute('aria-pressed', 'true');
	elements.sessionTitleShimmerButton.textContent = 'Pause';
	elements.sessionTitleShimmerStatus.textContent = 'Session title shimmer and PixelSpinner playing.';
}

function stopSessionTitleShimmer() {
	elements.sessionTitleShimmerComparison.classList.remove('is-playing');
	elements.sessionTitleShimmerButton.setAttribute('aria-pressed', 'false');
	elements.sessionTitleShimmerButton.textContent = 'Replay';
	elements.sessionTitleShimmerStatus.textContent = 'Session title shimmer and PixelSpinner paused.';
}

function playChatProgressShimmer() {
	if (elements.chatProgressShimmerComparison.classList.contains('is-playing')) {
		stopChatProgressShimmer();
		return;
	}

	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
		elements.chatProgressShimmerStatus.textContent = 'Motion preview is disabled by the reduced-motion preference.';
		return;
	}

	void elements.chatProgressShimmerComparison.offsetWidth;
	elements.chatProgressShimmerComparison.classList.add('is-playing');
	elements.chatProgressShimmerButton.setAttribute('aria-pressed', 'true');
	elements.chatProgressShimmerButton.textContent = 'Pause';
	elements.chatProgressShimmerStatus.textContent = 'Chat progress text shimmer and scenario motion playing.';
}

function stopChatProgressShimmer() {
	elements.chatProgressShimmerComparison.classList.remove('is-playing');
	elements.chatProgressShimmerButton.setAttribute('aria-pressed', 'false');
	elements.chatProgressShimmerButton.textContent = 'Replay';
	elements.chatProgressShimmerStatus.textContent = 'Chat progress text shimmer and scenario motion paused.';
}

function getSidebarWidthBounds() {
	return {
		minimum: MIN_SIDEBAR_WIDTH,
		maximum: Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, window.innerWidth - MIN_CONTENT_WIDTH))
	};
}

function getSidebarWidth() {
	return Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width')) || DEFAULT_SIDEBAR_WIDTH;
}

function setSidebarWidth(width, persist = false) {
	const { minimum, maximum } = getSidebarWidthBounds();
	const nextWidth = Math.round(Math.min(maximum, Math.max(minimum, width)));
	document.documentElement.style.setProperty('--sidebar-width', `${nextWidth}px`);
	elements.sidebarResizer.setAttribute('aria-valuemin', `${minimum}`);
	elements.sidebarResizer.setAttribute('aria-valuemax', `${maximum}`);
	elements.sidebarResizer.setAttribute('aria-valuenow', `${nextWidth}`);

	if (persist) {
		localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, `${nextWidth}`);
	}
}

function restoreSidebarWidth() {
	const savedWidth = Number.parseFloat(localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY));
	setSidebarWidth(Number.isFinite(savedWidth) ? savedWidth : DEFAULT_SIDEBAR_WIDTH);
}

function beginSidebarResize(event) {
	if (!event.isPrimary || event.button !== 0) {
		return;
	}

	activeResizePointerId = event.pointerId;
	elements.sidebarResizer.setPointerCapture(event.pointerId);
	document.body.classList.add('is-resizing-sidebar');
	event.preventDefault();
}

function resizeSidebarFromPointer(event) {
	if (event.pointerId !== activeResizePointerId) {
		return;
	}

	const shellLeft = elements.appShell.getBoundingClientRect().left;
	setSidebarWidth(event.clientX - shellLeft);
}

function endSidebarResize(event) {
	if (event.pointerId !== activeResizePointerId) {
		return;
	}

	activeResizePointerId = undefined;
	document.body.classList.remove('is-resizing-sidebar');
	setSidebarWidth(getSidebarWidth(), true);
}

function resizeSidebarFromKeyboard(event) {
	let nextWidth;
	const { minimum, maximum } = getSidebarWidthBounds();

	switch (event.key) {
		case 'ArrowLeft':
			nextWidth = getSidebarWidth() - SIDEBAR_KEYBOARD_STEP;
			break;
		case 'ArrowRight':
			nextWidth = getSidebarWidth() + SIDEBAR_KEYBOARD_STEP;
			break;
		case 'Home':
			nextWidth = minimum;
			break;
		case 'End':
			nextWidth = maximum;
			break;
		default:
			return;
	}

	event.preventDefault();
	setSidebarWidth(nextWidth, true);
}

function resetSidebarWidth() {
	setSidebarWidth(DEFAULT_SIDEBAR_WIDTH, true);
}

function clampSidebarToViewport() {
	setSidebarWidth(getSidebarWidth());
}

function switchView(view) {
	currentView = view;
	elements.navItems.forEach(item => {
		const active = item.dataset.view === view;
		item.classList.toggle('active', active);
		if (active) {
			item.setAttribute('aria-current', 'page');
		} else {
			item.removeAttribute('aria-current');
		}
	});

	elements.viewPanels.forEach(panel => {
		const active = panel.dataset.viewPanel === view;
		panel.hidden = !active;
		panel.classList.toggle('active', active);
	});

	document.getElementById('main-content').focus({ preventScroll: true });
	window.scrollTo({ top: 0, behavior: 'auto' });
}

function render() {
	if (elements.inventoryBody) {
		renderInventory();
	}
	if (elements.categoryBody) {
		renderPurposeSummary();
	}
	renderFindings();
	if (elements.questionBoard) {
		renderQuestions();
	}
	renderOverlapScenarios();
	if (elements.motionCoverageBody) {
		renderMotionCoverage();
	}
}

function renderInventory() {
	const search = elements.searchInput.value.trim().toLowerCase();
	const category = elements.categoryFilter.value;
	const source = elements.sourceFilter.value;

	const filtered = records.filter(record => {
		const searchable = [
			record.name,
			record.path,
			record.area,
			record.understanding,
			record.observations,
			record.question
		].join(' ').toLowerCase();
		return (!search || searchable.includes(search))
			&& (!category || record.category === category)
			&& (!source || record.source === source);
	});

	const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
	currentPage = Math.min(currentPage, pageCount);
	const pageStart = (currentPage - 1) * pageSize;
	const pageRecords = filtered.slice(pageStart, pageStart + pageSize);

	elements.filteredCount.textContent = `${filtered.length} ${filtered.length === 1 ? 'pattern' : 'patterns'}`;
	elements.emptyState.hidden = filtered.length !== 0;
	elements.inventoryTableWrap.hidden = filtered.length === 0;
	elements.inventoryPagination.hidden = filtered.length <= pageSize;
	elements.previousPageButton.disabled = currentPage === 1;
	elements.nextPageButton.disabled = currentPage === pageCount;
	elements.pageStatus.textContent = `Page ${currentPage} of ${pageCount}`;

	elements.inventoryBody.innerHTML = pageRecords.map(record => {
		const categoryName = getCategory(record.category)?.name || 'Purpose not assigned';
		const previewUrl = getPreviewUrl(record);
		const previewIsActive = activePreviewId === record.id;
		return `
			<tr>
				<td class="preview-cell">
					<div class="preview-shell">
						${previewIsActive
							? `<iframe
								class="preview-frame"
								src="${escapeHtml(previewUrl)}"
								title="${escapeHtml(record.name)} live animation preview"
								tabindex="-1"
							></iframe>`
							: `<button
								class="preview-trigger"
								type="button"
								data-preview-record-id="${escapeHtml(record.id)}"
								aria-label="Play ${escapeHtml(record.name)} animation preview"
							>Play preview</button>`}
					</div>
					<div class="preview-actions">
						${previewIsActive
							? `<button
								class="preview-link"
								type="button"
								data-preview-record-id="${escapeHtml(record.id)}"
								aria-label="Stop ${escapeHtml(record.name)} animation preview"
							>Stop preview</button>`
							: ''}
						<a class="preview-link" href="${escapeHtml(previewUrl)}" data-open-preview target="_blank" rel="noreferrer">Open preview</a>
					</div>
				</td>
				<td class="component-cell">
					<strong>${escapeHtml(record.name)}</strong>
					<span title="${escapeHtml(record.path)}">${escapeHtml(record.path || record.area || 'Path not recorded')}</span>
				</td>
				<td class="understanding-cell">${escapeHtml(record.understanding)}</td>
				<td><span class="tag">${escapeHtml(categoryName)}</span></td>
				<td><span class="tag">${escapeHtml(record.source)}</span></td>
				<td><button class="row-action" type="button" data-record-id="${escapeHtml(record.id)}" aria-label="Edit ${escapeHtml(record.name)}">Edit</button></td>
			</tr>
		`;
	}).join('');

	elements.inventoryBody.querySelectorAll('[data-record-id]').forEach(button => {
		button.addEventListener('click', () => openRecordDialog(button.dataset.recordId));
	});
	elements.inventoryBody.querySelectorAll('[data-preview-record-id]').forEach(button => {
		button.addEventListener('click', () => togglePreview(button.dataset.previewRecordId));
	});
	elements.inventoryBody.querySelectorAll('[data-open-preview]').forEach(link => {
		link.addEventListener('click', enableComponentExplorerAnimations);
	});
	initializePreviewFrames();
}

function renderPurposeSummary() {
	elements.categoryBody.innerHTML = categories.map(category => {
		const matching = records.filter(record => record.category === category.id);
		const examples = matching.length ? matching.slice(0, 5).map(record => record.name) : category.examples;
		return `
			<tr>
				<td class="category-name-cell"><strong>${escapeHtml(category.name)}</strong></td>
				<td class="category-purpose-cell">${escapeHtml(category.description)}</td>
				<td class="category-examples-cell">${examples.map(escapeHtml).join(', ')}</td>
				<td class="category-record-count">${matching.length}</td>
			</tr>
		`;
	}).join('');
}

function renderFindings() {
	elements.findingsBody.innerHTML = currentFindings.map(finding => {
		const evidence = finding.evidenceIds
			.map(id => records.find(record => record.id === id))
			.filter(Boolean);
		const scenarios = (finding.scenarioIds ?? [])
			.map(id => overlapScenarios.find(scenario => scenario.id === id))
			.filter(Boolean);
		const evidenceGroups = [];
		if (evidence.length) {
			const componentEvidence = isPublicBuild
				? evidence.map(record => `${escapeHtml(record.name)}${record.referenceState ? ` <span class="finding-evidence-state">(${escapeHtml(record.referenceState)})</span>` : ''}`).join(', ')
				: evidence.map(record => `<a
					class="finding-evidence-link"
					href="${escapeHtml(getReferenceUrl(record))}"
					target="_blank"
					rel="noreferrer"
					aria-label="Open ${escapeHtml(record.name)}${record.referenceState ? `, ${escapeHtml(record.referenceState)}` : ''} visual reference"
				>${escapeHtml(record.name)}${record.referenceState ? ` <span class="finding-evidence-state">(${escapeHtml(record.referenceState)})</span>` : ''}</a>`).join(', ');
			evidenceGroups.push(`<span><strong>Components:</strong> ${componentEvidence}</span>`);
		}
		if (scenarios.length) {
			evidenceGroups.push(`<span><strong>Coordination:</strong> ${scenarios.map(scenario => `<a
				class="finding-evidence-link"
				href="#${escapeHtml(scenario.id)}-title"
				data-coordination-scenario-id="${escapeHtml(scenario.id)}"
				aria-label="View ${escapeHtml(scenario.title)} on the Coordination page"
			>${escapeHtml(scenario.title)}</a>`).join(', ')}</span>`);
		}
		return `
			<tr>
				<td class="finding-title-cell"><strong>${escapeHtml(finding.finding)}</strong></td>
				<td class="finding-importance-cell">${escapeHtml(finding.whyItMatters)}</td>
				<td class="finding-evidence-cell">${evidenceGroups.length ? evidenceGroups.join('<br>') : 'Evidence still needed'}</td>
				<td class="finding-next-cell">${escapeHtml(finding.checkNext)}</td>
			</tr>
		`;
	}).join('');

	elements.findingsBody.querySelectorAll('[data-coordination-scenario-id]').forEach(link => {
		link.addEventListener('click', event => {
			event.preventDefault();
			const targetId = `${link.dataset.coordinationScenarioId}-title`;
			switchView('overlap');
			requestAnimationFrame(() => {
				const target = document.getElementById(targetId);
				if (!target) {
					return;
				}
				target.tabIndex = -1;
				target.focus({ preventScroll: true });
				target.scrollIntoView({ block: 'start', behavior: 'auto' });
			});
		});
	});
}

function renderQuestions() {
	const questions = records.filter(record => record.question.trim());

	elements.questionBoard.innerHTML = questions.length
		? questions.map(record => {
			const categoryName = getCategory(record.category)?.name || 'Purpose not assigned';
			return `
				<tr>
					<td class="question-purpose-cell"><span class="tag">${escapeHtml(categoryName)}</span></td>
					<td class="question-text-cell">“${escapeHtml(record.question)}”</td>
					<td class="question-component-cell">${escapeHtml(record.name)}</td>
					<td class="question-action-cell"><a
						class="finding-evidence-link"
						href="${escapeHtml(getReferenceUrl(record))}"
						target="_blank"
						rel="noreferrer"
						aria-label="Open ${escapeHtml(record.name)} visual reference"
					>View reference</a></td>
				</tr>
			`;
		}).join('')
		: '<tr><td colspan="4"><div class="empty-state"><h3>No open questions yet</h3><p>Add a neutral question to a motion example.</p></div></td></tr>';
}

function renderOverlapScenarios() {
	elements.overlapBoard.innerHTML = overlapScenarios.map(scenario => {
		const maximumConcurrentMotions = getMaximumConcurrentMotions(scenario.motions);
		const verificationLabels = {
			production: 'Production confirmed',
			confirmed: 'Source or fixture confirmed',
			candidate: 'Needs production verification'
		};
		const verificationLabel = verificationLabels[scenario.verification];
		const motionCountLabel = maximumConcurrentMotions
			? `${maximumConcurrentMotions} current-profile motions at once`
			: 'No validated product motion';
		const evidenceLabels = {
			production: 'Production capture',
			confirmed: 'Current source, focused test, or component fixture',
			candidate: 'Components exist; live overlap capture needed'
		};
		const evidenceLabel = evidenceLabels[scenario.verification];
		const scenarioHeader = `
			<header class="overlap-scenario-header">
				<div>
					<h3 id="${escapeHtml(scenario.id)}-title">${escapeHtml(scenario.title)}</h3>
					<span class="overlap-count">${motionCountLabel}</span>
					${scenario.observation ? `<p class="overlap-observation">${escapeHtml(scenario.observation)}</p>` : ''}
					<dl class="overlap-validation-meta">
						<div><dt>Baseline</dt><dd>${escapeHtml(coordinationValidationBaseline.product)} · ${escapeHtml(coordinationValidationBaseline.commit)}</dd></div>
						<div><dt>Checked</dt><dd>${escapeHtml(coordinationValidationBaseline.checkedOn)}</dd></div>
						<div><dt>Profile</dt><dd>${escapeHtml(coordinationValidationBaseline.settings)}</dd></div>
						<div><dt>Evidence</dt><dd>${escapeHtml(evidenceLabel)}</dd></div>
					</dl>
				</div>
				<span class="overlap-verification overlap-verification-${escapeHtml(scenario.verification)}">${verificationLabel}</span>
			</header>
		`;
		const timeline = `
			<div class="overlap-timeline-scroll">
				<div class="overlap-timeline${scenario.recording ? ' has-playhead' : ''}"${scenario.recording ? ` data-coordination-timeline="${escapeHtml(scenario.id)}"` : ''}>
					<div class="overlap-axis" aria-hidden="true">
						<span></span>
						<div class="overlap-axis-phases">
							${scenario.phases.map((phase, index) => `<span style="left: ${index * 50}%">${escapeHtml(phase)}</span>`).join('')}
						</div>
					</div>
					${overlapPanels.map(panel => renderOverlapLane(panel, scenario.motions)).join('')}
					${scenario.recording ? '<span class="overlap-playhead" data-coordination-playhead aria-hidden="true"><i></i></span>' : ''}
				</div>
			</div>
		`;
		const accessibleMotionList = `
			<ul class="visually-hidden">
				${scenario.motions.map(motion => `<li>${escapeHtml(motion.label)} in ${escapeHtml(getOverlapPanelName(motion.panel))}, from ${motion.start}% to ${motion.end}% of the scenario.</li>`).join('')}
			</ul>
		`;

		if (scenario.recording) {
			return `
				<article class="overlap-scenario overlap-scenario-recorded" aria-labelledby="${escapeHtml(scenario.id)}-title">
					<div class="overlap-recorded-layout">
						<div class="overlap-analysis">
							${scenarioHeader}
							${timeline}
						</div>
						<figure class="overlap-recording">
							<div class="overlap-recording-header">
								<div>
									<span class="overlap-recording-kicker">${escapeHtml(scenario.recording.kicker || 'Real product capture')}</span>
									<strong>${escapeHtml(scenario.recording.label)}</strong>
								</div>
								<button class="button button-secondary overlap-recording-toggle" type="button" data-coordination-recording-toggle aria-pressed="false">
									Play replay
								</button>
							</div>
							<video
								data-coordination-recording
								muted
								loop
								playsinline
								preload="metadata"
								poster="${escapeHtml(scenario.recording.poster)}"
								aria-describedby="${escapeHtml(scenario.id)}-recording-description"
							>
								<source src="${escapeHtml(scenario.recording.src)}" type="video/mp4">
							</video>
							${renderOverlapRecordingSummary(scenario)}
							<figcaption id="${escapeHtml(scenario.id)}-recording-description">${escapeHtml(scenario.recording.description)}</figcaption>
						</figure>
					</div>
					${accessibleMotionList}
				</article>
			`;
		}

		return `
			<article class="overlap-scenario" aria-labelledby="${escapeHtml(scenario.id)}-title">
				${scenarioHeader}
				${timeline}
				${accessibleMotionList}
			</article>
		`;
	}).join('');

	initializeCoordinationRecordings();
}

function renderOverlapRecordingSummary(scenario) {
	const activePanels = overlapPanels
		.map(panel => ({
			panel,
			motions: scenario.motions.filter(motion => motion.panel === panel.id)
		}))
		.filter(entry => entry.motions.length);
	const stillPanels = overlapPanels.filter(panel => !scenario.motions.some(motion => motion.panel === panel.id));
	const areaLabel = activePanels.length === 1 ? 'product area' : 'product areas';

	return `
		<div class="overlap-recording-summary">
			<strong>${scenario.motions.length} motions across ${activePanels.length} ${areaLabel}</strong>
			<ul>
				${activePanels.map(entry => `
					<li>
						<span>${escapeHtml(entry.panel.name)}</span>
						${entry.motions.map(motion => escapeHtml(motion.label)).join(', ')}
					</li>
				`).join('')}
				${stillPanels.length ? `
					<li>
						<span>Still</span>
						${stillPanels.map(panel => escapeHtml(panel.name)).join(', ')}
					</li>
				` : ''}
			</ul>
		</div>
	`;
}

function initializeCoordinationRecordings() {
	const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	document.querySelectorAll('[data-coordination-recording]').forEach(video => {
		const scenario = video.closest('.overlap-scenario-recorded');
		const toggle = scenario.querySelector('[data-coordination-recording-toggle]');
		const timeline = scenario.querySelector('[data-coordination-timeline]');
		const playhead = scenario.querySelector('[data-coordination-playhead]');
		const axis = timeline.querySelector('.overlap-axis-phases');
		let manuallyPaused = true;

		const updatePlaybackState = () => {
			const isPlaying = !video.paused;
			toggle.textContent = isPlaying ? 'Pause replay' : 'Play replay';
			toggle.setAttribute('aria-pressed', String(isPlaying));
		};
		const updatePlayhead = () => {
			if (!video.duration) {
				return;
			}
			const progress = Math.min(video.currentTime / video.duration, 1);
			playhead.style.left = `${axis.offsetLeft + axis.clientWidth * progress}px`;
		};
		const showRepresentativeFrame = () => {
			if (reduceMotion && video.duration) {
				video.currentTime = Math.min(1.8, video.duration);
			}
			updatePlayhead();
		};

		toggle.addEventListener('click', async () => {
			if (video.paused) {
				manuallyPaused = false;
				await video.play();
			} else {
				manuallyPaused = true;
				video.pause();
			}
		});
		video.addEventListener('play', updatePlaybackState);
		video.addEventListener('pause', updatePlaybackState);
		video.addEventListener('timeupdate', updatePlayhead);
		video.addEventListener('loadedmetadata', showRepresentativeFrame);
		new ResizeObserver(updatePlayhead).observe(timeline);
		updatePlaybackState();
		if (video.readyState >= 1) {
			showRepresentativeFrame();
		}

		if (!reduceMotion) {
			const observer = new IntersectionObserver(entries => {
				const isVisible = entries.some(entry => entry.isIntersecting);
				if (isVisible && !manuallyPaused) {
					video.play().catch(updatePlaybackState);
				} else if (!isVisible) {
					video.pause();
				}
			}, { threshold: 0.5 });
			observer.observe(video);
		}
	});
}

function renderMotionCoverage() {
	const sourceCount = motionCoverage.length;
	const fixtureExercisedCount = motionCoverage.filter(item => item.fixture.startsWith('Exercised')).length;
	const productionConfirmedCount = motionCoverage.filter(item => item.production === 'Confirmed').length;
	const missingFixtureCount = motionCoverage.filter(item => item.fixture === 'Missing' || item.fixture.includes('Missing')).length;

	elements.motionCoverageMetrics.innerHTML = [
		['Source capabilities', sourceCount],
		['Fixtures exercising motion', fixtureExercisedCount],
		['Production confirmed', productionConfirmedCount],
		['Missing fixture coverage', missingFixtureCount]
	].map(([label, value]) => `
		<div class="coverage-metric">
			<strong>${value}</strong>
			<span>${label}</span>
		</div>
	`).join('');

	elements.motionCoverageBody.innerHTML = motionCoverage.map(item => `
		<tr>
			<td>${escapeHtml(item.surface)}</td>
			<td><strong>${escapeHtml(item.motion)}</strong><span class="coverage-trigger">${escapeHtml(item.trigger)}</span></td>
			<td>${escapeHtml(item.implementation)}</td>
			<td><code>${escapeHtml(item.sourcePath)}</code></td>
			<td><span class="coverage-status">${escapeHtml(item.fixture)}</span></td>
			<td><span class="coverage-status">${escapeHtml(item.production)}</span></td>
			<td>${escapeHtml(item.overlap)}</td>
		</tr>
	`).join('');
}

function renderOverlapLane(panel, motions) {
	const panelMotions = motions.filter(motion => motion.panel === panel.id);
	const rowCount = Math.max(panelMotions.length, 1);
	return `
		<div class="overlap-lane">
			<div class="overlap-lane-label">${escapeHtml(panel.name)}</div>
			<div class="overlap-track" style="--motion-row-count: ${rowCount}" aria-hidden="true">
				${panelMotions.length
					? panelMotions.map((motion, index) => `<span
						class="overlap-motion overlap-motion-${escapeHtml(panel.id)}"
						style="left: ${motion.start}%; width: ${motion.end - motion.start}%; top: calc(${index} * 32px)"
						title="${escapeHtml(motion.label)}"
					>${escapeHtml(motion.label)}</span>`).join('')
					: '<span class="overlap-empty">No audited motion</span>'}
			</div>
		</div>
	`;
}

function getMaximumConcurrentMotions(motions) {
	if (!motions.length) {
		return 0;
	}
	const points = [...new Set(motions.flatMap(motion => [motion.start, motion.end]))];
	return Math.max(...points.map(point => motions.filter(motion => motion.start <= point && motion.end > point).length), 1);
}

function getOverlapPanelName(panelId) {
	return overlapPanels.find(panel => panel.id === panelId)?.name || panelId;
}

function openRecordDialog(id) {
	elements.recordForm.reset();
	const record = id ? records.find(candidate => candidate.id === id) : undefined;
	document.getElementById('record-dialog-title').textContent = record ? `Edit ${record.name}` : 'Add a motion example';
	elements.deleteButton.hidden = !record;

	const values = record || {
		id: '',
		name: '',
		area: '',
		path: '',
		source: '',
		understanding: '',
		category: '',
		trigger: '',
		before: '',
		after: '',
		pattern: '',
		scope: '',
		duration: '',
		easing: '',
		repetition: '',
		nearby: '',
		reducedMotion: '',
		nonvisual: '',
		observations: '',
		question: ''
	};

	Object.entries(values).forEach(([key, value]) => {
		const field = document.getElementById(`record-${toKebabCase(key)}`);
		if (field) {
			field.value = value;
		}
	});

	elements.recordDialog.showModal();
	document.getElementById('record-name').focus();
}

function closeRecordDialog() {
	elements.recordDialog.close();
}

function saveRecordFromForm(event) {
	event.preventDefault();
	if (!elements.recordForm.reportValidity()) {
		return;
	}

	const formData = new FormData(elements.recordForm);
	const id = formData.get('id') || createId(formData.get('name'));
	const record = {
		id,
		name: formData.get('name').trim(),
		area: formData.get('area').trim(),
		path: formData.get('path').trim(),
		source: formData.get('source'),
		understanding: formData.get('understanding').trim(),
		category: formData.get('category'),
		trigger: formData.get('trigger').trim(),
		before: formData.get('before').trim(),
		after: formData.get('after').trim(),
		pattern: formData.get('pattern').trim(),
		scope: formData.get('scope').trim(),
		duration: formData.get('duration').trim(),
		easing: formData.get('easing').trim(),
		repetition: formData.get('repetition').trim(),
		nearby: formData.get('nearby').trim(),
		reducedMotion: formData.get('reducedMotion').trim(),
		nonvisual: formData.get('nonvisual').trim(),
		observations: formData.get('observations').trim(),
		question: formData.get('question').trim()
	};

	const existingIndex = records.findIndex(candidate => candidate.id === id);
	if (existingIndex >= 0) {
		records[existingIndex] = record;
	} else {
		records.unshift(record);
	}

	saveRecords();
	closeRecordDialog();
	render();
	showToast(`${record.name} saved`);
}

function deleteCurrentRecord() {
	const id = document.getElementById('record-id').value;
	const record = records.find(candidate => candidate.id === id);
	if (!record) {
		return;
	}

	const confirmed = window.confirm(`Delete the motion example for ${record.name}?`);
	if (!confirmed) {
		return;
	}

	records = records.filter(candidate => candidate.id !== id);
	saveRecords();
	closeRecordDialog();
	render();
	showToast(`${record.name} deleted`);
}

function clearFilters() {
	elements.searchInput.value = '';
	elements.categoryFilter.value = '';
	elements.sourceFilter.value = '';
	currentPage = 1;
	activePreviewId = undefined;
	renderInventory();
	elements.searchInput.focus();
}

function togglePreview(recordId) {
	const previewIsStarting = activePreviewId !== recordId;
	if (previewIsStarting) {
		enableComponentExplorerAnimations();
	}
	activePreviewId = previewIsStarting ? recordId : undefined;
	renderInventory();
	const nextControl = elements.inventoryBody.querySelector(`[data-preview-record-id="${CSS.escape(recordId)}"]`);
	nextControl?.focus();
	if (previewIsStarting) {
		showToast('Animation preview playing');
	} else {
		showToast('Animation preview stopped');
	}
}

function changePage(page) {
	currentPage = page;
	activePreviewId = undefined;
	renderInventory();
	elements.inventoryTableWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function exportData() {
	const payload = {
		title: 'VS Code Motion Audit',
		phase: 'Phase 1 — Audit current production motion',
		exportedAt: new Date().toISOString(),
		examples: records
	};
	const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = `vscode-motion-audit-${new Date().toISOString().slice(0, 10)}.json`;
	link.click();
	URL.revokeObjectURL(url);
	showToast('Audit data exported');
}

function showToast(message) {
	window.clearTimeout(toastTimer);
	elements.toast.textContent = message;
	elements.toast.hidden = false;
	toastTimer = window.setTimeout(() => {
		elements.toast.hidden = true;
	}, 2600);
}

function getCategory(id) {
	return categories.find(category => category.id === id);
}

function getPreviewUrl(record) {
	const fixturePath = getFixturePath(record);
	const fixtureName = fixturePath.split('/').at(-1) || record.name;
	return `${componentExplorerUrl}?fixture=${encodeURIComponent(fixturePath)}&search=${encodeURIComponent(fixtureName)}`;
}

function getReferenceUrl(record) {
	const parameters = new URLSearchParams({
		fixture: getFixturePath(record),
		name: record.name
	});
	if (record.referenceState) {
		parameters.set('state', record.referenceState);
	}
	return `${window.location.origin}/reference.html?${parameters}`;
}

function getFixturePath(record) {
	return record.path
		.split('/')
		.map(segment => segment.trim())
		.filter(Boolean)
		.join('/');
}

function enableComponentExplorerAnimations() {
	let inputValues = {};
	const storedInputValues = localStorage.getItem(COMPONENT_EXPLORER_INPUTS_KEY);
	if (storedInputValues) {
		try {
			const parsedInputValues = JSON.parse(storedInputValues);
			if (parsedInputValues && typeof parsedInputValues === 'object' && !Array.isArray(parsedInputValues)) {
				inputValues = parsedInputValues;
			}
		} catch (error) {
			console.error('Could not read Component Explorer input values.', error);
		}
	}
	inputValues[ENABLE_ANIMATIONS_INPUT_KEY] = true;
	localStorage.setItem(COMPONENT_EXPLORER_INPUTS_KEY, JSON.stringify(inputValues));
}

function initializePreviewFrames() {
	document.querySelectorAll('iframe.preview-frame').forEach(frame => {
		frame.addEventListener('load', () => window.MotionPreview.preparePreviewFrame(frame));
		if (frame.contentDocument?.readyState === 'complete' && frame.contentWindow?.location.href !== 'about:blank') {
			window.MotionPreview.preparePreviewFrame(frame);
		}
	});
}

function createId(name) {
	const base = String(name)
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '') || 'motion-record';
	let id = base;
	let suffix = 2;
	while (records.some(record => record.id === id)) {
		id = `${base}-${suffix}`;
		suffix += 1;
	}
	return id;
}

function toKebabCase(value) {
	return value.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`);
}

function escapeHtml(value) {
	return String(value ?? '')
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#039;');
}
