"""Static server for the planner plus one write endpoint the in-page fetch tools post to.

    python3 tools/serve.py 8791

GET serves the repo. POST /save/<name>.json writes research/fetched/<name>.json — used by
tools/fetch.js, which runs inside Chrome (the only thing here that reaches OSRM and Nominatim)
and posts its results back, so large matrices never pass through the devtools channel.
Development only: binds 127.0.0.1, and the name is restricted to [a-z0-9_-].
"""
import http.server, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'research', 'fetched')


class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_GET(self):
        # The planner's service worker must never control the tool origin: it would answer
        # fetch.js and data/*.json from its cache, which is how a stale matrix happened once.
        if self.path.split('?')[0].endswith('sw.js'):
            self.send_error(404)
            return
        super().do_GET()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Methods', 'POST')
        self.send_header('Access-Control-Allow-Headers', 'content-type')
        self.end_headers()

    def do_POST(self):
        m = re.match(r'^/save/([a-z0-9_-]+)\.json$', self.path)
        # Photos fetched in-page (Commons answers Chrome, not curl, from here) land in
        # research/fetched/img/ for tools/photos.py to resize and rename; never straight into images/.
        im = re.match(r'^/save-img/([a-z0-9_-]+)\.(jpg|jpeg|png|webp)$', self.path)
        if not (m or im):
            self.send_error(404)
            return
        n = int(self.headers.get('content-length', 0))
        if n > 8_000_000:
            self.send_error(413)
            return
        d = os.path.join(OUT, 'img') if im else OUT
        os.makedirs(d, exist_ok=True)
        name = (im.group(1) + '.' + im.group(2)) if im else (m.group(1) + '.json')
        with open(os.path.join(d, name), 'wb') as f:
            f.write(self.rfile.read(n))
        self.send_response(204)
        self.end_headers()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8791
    http.server.ThreadingHTTPServer(('127.0.0.1', port), H).serve_forever()
