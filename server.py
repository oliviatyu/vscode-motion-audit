from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import re
from urllib.error import HTTPError
from urllib.request import Request, urlopen


ROOT = Path(__file__).parent
COMPONENT_EXPLORER_ORIGIN = 'http://localhost:5123'
LIBRARY_THUMBNAIL_PATH = re.compile(r'^/assets/library-thumbnails/[a-z0-9-]+\.jpg$')
LOCAL_FILES = {
	'/',
	'/index.html',
	'/styles.css',
	'/app.js',
	'/motionPrototype.js',
	'/motionPrototype.css',
	'/assets/prototype-pixel-spinner.css',
	'/assets/prototype-codicon.ttf',
	'/assets/prototype-working-logo.png',
	'/assets/prototype-vscode-LICENSE.txt',
	*(f'/assets/prototypes/sessions-panel/{option}.{extension}'
		for option in ('icon-pulse', 'background-pulse', 'static')
		for extension in ('mp4', 'jpg')),
	*(f'/assets/prototypes/chat-panel/{option}.{extension}'
		for option in ('sticky-border', 'sticky-static', 'inline-static', 'inline-border', 'tabbed-grid', 'tabbed-single')
		for extension in ('mp4', 'jpg')),
	*(f'/assets/prototypes/combined-panels/{option}.{extension}'
		for option in ('icon-pulse-sticky', 'background-pulse-sticky')
		for extension in ('mp4', 'jpg')),
	'/previewFrame.js',
	'/reference.html',
	'/reference.js',
	'/assets/session-multiple-status-motions.mp4',
	'/assets/input-working-border-production.mp4',
	'/assets/chat-progress-text-shimmer-production.mp4',
	'/assets/bulk-action-undo-countdown-production.mp4',
	'/assets/local-tool-pixel-spinner-production.mp4',
	'/assets/voice-state-indicators-production.mp4',
	'/assets/generated-image-lifecycle-production.mp4',
	'/assets/opportunities-chats-list-production.mp4',
	'/assets/opportunities-customizations-loading.mp4',
	'/assets/opportunities-customizations-loading.jpg',
	'/assets/opportunities-function-search.mp4',
	'/assets/opportunities-function-search.jpg',
	'/assets/opportunities-dot-matrix-states.mp4',
	'/assets/opportunities-dot-matrix-states.jpg',
	'/assets/opportunities-browser-loading.mp4',
	'/assets/opportunities-browser-loading.jpg',
	'/assets/opportunities-color-meanings.png',
	'/assets/opportunities-color-guidelines.png',
	'/assets/opportunities-title-shimmer-current-production.mp4',
	'/assets/opportunities-input-needed-status-production.mp4',
	'/assets/opportunities-sessions-list-production.mp4',
	'/assets/opportunities-competing-motion-production.mp4',
	'/assets/opportunities-header-status-1.png',
	'/assets/opportunities-header-status-2.png',
	'/assets/opportunities-header-status-3.png',
	'/assets/library-performance.json',
	'/assets/library-animation-performance.json',
	'/assets/component-timing-verification.json',
	'/assets/native-cpu-performance-2026-10-23.json',
	*(f'/assets/motion-patterns/{name}' for name in (
		'index.html', 'proposal.js', 'functional-motion.png', 'decorative-motion.png',
		'arc.png', 'pixel.png', 'loading-customizations-user.png',
		'loading-search-editor-user.png', 'determinate-user.png', 'countdown.png',
		'working-status-user.png', 'progress-shimmer-user.png',
		'dictation-recording-user.png', 'voice-mode-user.png', 'generation.png',
		'confetti.png', 'pet.png', 'chat-input-border-user.png',
	)),
	*(f'/assets/motion-patterns/loading-bar-proposal/{name}' for name in (
		'index.html', 'prototype.css', 'prototype.js', 'codicon.css', 'codicon.ttf', 'LICENSE',
	)),
	'/assets/live-insiders/request-production-case.png',
	'/assets/live-insiders/aquarium-production-case.png',
	'/assets/live-insiders/chat-progress-text-shimmer-poster.jpg',
	'/assets/live-insiders/bulk-action-undo-countdown-poster.jpg',
	'/assets/live-insiders/voice-state-indicators-poster.jpg',
	'/assets/live-insiders/agent-details-loading.mp4',
	'/assets/live-insiders/agent-details-loading-poster.jpg',
	'/assets/live-insiders/bulk-completion-while-running.mp4',
	'/assets/live-insiders/bulk-completion-while-running-poster.jpg',
	'/assets/live-insiders/create-pull-request-generation.mp4',
	'/assets/live-insiders/create-pull-request-generation-poster.jpg',
	'/assets/live-insiders/editing-while-multidiff-open.mp4',
	'/assets/live-insiders/editing-while-multidiff-open-poster.jpg',
	'/assets/live-insiders/generated-image-lifecycle-poster.jpg',
	'/assets/live-insiders/local-tool-pixel-spinner-poster.jpg',
	'/assets/live-insiders/one-repository-session.mp4',
	'/assets/live-insiders/one-repository-session-poster.jpg',
	'/assets/live-insiders/streaming-response-poster.jpg',
	'/assets/live-insiders/two-visible-sessions.mp4',
	'/assets/live-insiders/two-visible-sessions-poster.jpg',
	'/assets/live-insiders/waiting-for-user-confirmation.mp4',
	'/assets/live-insiders/waiting-for-user-confirmation-poster.jpg',
	*(f'/assets/live-insiders/chat-working-logo/frame-{index:02}.png' for index in range(12)),
	*(f'/assets/live-insiders/input-working-border/frame-{index:02}.png' for index in range(12)),
	*(f'/assets/live-insiders/local-tool-spinner/context-{index:02}.png' for index in range(8)),
	*(f'/assets/live-insiders/aquarium/frame-{index:02}.png' for index in range(12)),
}


class MotionAuditHandler(SimpleHTTPRequestHandler):
	def __init__(self, *args, **kwargs):
		super().__init__(*args, directory=ROOT, **kwargs)

	def end_headers(self):
		path = self.path.split('?', 1)[0]
		if path in LOCAL_FILES or LIBRARY_THUMBNAIL_PATH.fullmatch(path):
			self.send_header('Cache-Control', 'no-store')
		super().end_headers()

	def do_GET(self):
		path = self.path.split('?', 1)[0]
		if path in LOCAL_FILES or LIBRARY_THUMBNAIL_PATH.fullmatch(path):
			return super().do_GET()
		self._proxy_component_explorer()

	def _proxy_component_explorer(self):
		request = Request(f'{COMPONENT_EXPLORER_ORIGIN}{self.path}', headers={'Accept-Encoding': 'identity'})
		try:
			with urlopen(request) as response:
				body = response.read()
				self.send_response(response.status)
				for name, value in response.headers.items():
					if name.lower() not in {'connection', 'content-length', 'transfer-encoding', 'content-encoding'}:
						self.send_header(name, value)
				self.send_header('Content-Length', str(len(body)))
				self.end_headers()
				self.wfile.write(body)
		except HTTPError as error:
			body = error.read()
			self.send_response(error.code)
			self.send_header('Content-Type', error.headers.get_content_type())
			self.send_header('Content-Length', str(len(body)))
			self.end_headers()
			self.wfile.write(body)


if __name__ == '__main__':
	ThreadingHTTPServer(('localhost', 4173), MotionAuditHandler).serve_forever()
