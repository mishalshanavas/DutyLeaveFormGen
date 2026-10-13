"""Local popup UI harness. Chrome APIs use synthetic fixtures, never real accounts."""
import base64
import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os

ROOT = Path(__file__).resolve().parent.parent
os.chdir(ROOT)

class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/test-popup':
            content = (ROOT / 'popup.html').read_text().replace('<head>',
                '<head><base href="/"><script src="tests/mock-chrome.js"></script>')
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Security-Policy', json.loads((ROOT / 'manifest.json').read_text())['content_security_policy']['extension_pages'])
            self.end_headers()
            self.wfile.write(content.encode())
        else:
            super().do_GET()

    def do_POST(self):
        if self.path != '/__test_download':
            self.send_error(404)
            return
        size = int(self.headers.get('Content-Length', '0'))
        if not 0 < size < 10_000_000:
            self.send_error(413)
            return
        data_url = self.rfile.read(size).decode()
        if not data_url.startswith('data:application/pdf;base64,'):
            self.send_error(400)
            return
        content = base64.b64decode(data_url.split(',', 1)[1], validate=True)
        target = ROOT / 'tmp/pdfs/ui-test.pdf'
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'ok')

print('Synthetic popup harness: http://127.0.0.1:8765/test-popup', flush=True)
ThreadingHTTPServer(('127.0.0.1', 8765), Handler).serve_forever()
