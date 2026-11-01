"""Prepare apps-script/ for `clasp push`: copy the shared parser and stamp the build hash.

    python3 tools/gas_build.py

tools/gmlist.js is copied verbatim to apps-script/gmlist.js, so the page and the server parse a
Google Maps list identically. BUILD in Code.js becomes the first 12 hex of SHA-256 over the three
source files, so `{"action":"health"}` says which build is live.
"""
import hashlib, os, re, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(ROOT, 'apps-script')
shutil.copyfile(os.path.join(ROOT, 'tools', 'gmlist.js'), os.path.join(A, 'gmlist.js'))
code = open(os.path.join(A, 'Code.js')).read()
h = hashlib.sha256()
for f in ('gmlist.js', 'gm.js'):
    h.update(open(os.path.join(A, f), 'rb').read())
h.update(re.sub(r"const BUILD = '[^']*';", '', code).encode())
build = h.hexdigest()[:12]
open(os.path.join(A, 'Code.js'), 'w').write(re.sub(r"const BUILD = '[^']*';", "const BUILD = '%s';" % build, code))
print('build', build)
