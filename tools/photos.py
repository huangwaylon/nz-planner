"""Photos for the planner: research/fetched/img + photos-meta.json -> images/nz/ + data/nz/photos.json.

    python3 tools/photos.py

Inputs come from tools/photos.js (run inside Chrome; Commons answers Chrome, not curl, from here):
research/fetched/img/<id>.jpg is the Commons 960px thumbnail of the pick, and
research/fetched/photos-meta.json holds its author, licence and file page. EXTRA adds photos that
are not from Commons (the book's own hero). The picks and why are in research/photos.md.

Each photo becomes images/nz/<id>-<hash>.jpg (480 px wide) and <id>-<hash>@2x.jpg (960 px), centre-
cropped to no wider than 16:9, progressive JPEG (ImageIO quality .45 / .32, about libjpeg 70 / 55) with all metadata dropped (EXIF/GPS
included). The hash is of the source bytes, so a changed photo gets a new filename and the stable
`nzp-media` cache never serves a stale one: the book's rule, never change a photo in place. Files in
images/nz/ that no entry names any more are deleted.

macOS only, no pip dependencies: `sips` resamples and crops, ImageIO (through JXA) encodes, because
sips cannot write progressive JPEG.
"""
import hashlib, json, os, shutil, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'research', 'fetched', 'img')
META = os.path.join(ROOT, 'research', 'fetched', 'photos-meta.json')
OUT = os.path.join(ROOT, 'images', 'nz')
JSON = os.path.join(ROOT, 'data', 'nz', 'photos.json')
W1, W2, MAX_ASPECT = 480, 960, 16 / 9
WT = 208                    # list thumbnail width
# ImageIO's quality scale runs high: its 0.45 is about libjpeg's 70 and lands near 25 KB at 480 px.
# The 2x copy is only shown at DPR >= 2, where compression hides better, so it goes lower.
Q1, Q2 = 0.45, 0.32

# Not from Commons. The book's hero belongs to the owner; its credit says where it came from.
EXTRA = {
    'pouakai-tarns': {'file': os.path.join(ROOT, '..', 'travel-plans', 'images', 'nz-hero.jpg'),
                      'credit': 'Travel book', 'page': '', 'licence': ''},
}

PD_URL = 'https://creativecommons.org/publicdomain/mark/1.0/'
CC0_URL = 'https://creativecommons.org/publicdomain/zero/1.0/'

# ImageIO encoder: progressive JPEG at a set quality, and no source properties copied across.
JXA = r"""
ObjC.import('ImageIO'); ObjC.import('Foundation');
function run(argv) {
  const src = $.CGImageSourceCreateWithURL($.NSURL.fileURLWithPath(argv[0]), null);
  const img = $.CGImageSourceCreateImageAtIndex(src, 0, null);
  const dst = $.CGImageDestinationCreateWithURL($.NSURL.fileURLWithPath(argv[1]), $('public.jpeg'), 1, null);
  const jfif = $.NSMutableDictionary.alloc.init;
  jfif.setObjectForKey($.NSNumber.numberWithBool(true), $('IsProgressive'));
  const p = $.NSMutableDictionary.alloc.init;
  p.setObjectForKey($.NSNumber.numberWithDouble(parseFloat(argv[2])), $('kCGImageDestinationLossyCompressionQuality'));
  p.setObjectForKey(jfif, $('{JFIF}'));
  $.CGImageDestinationSetProperties(dst, p);
  $.CGImageDestinationAddImage(dst, img, p);
  return $.CGImageDestinationFinalize(dst) ? 'ok' : 'fail';
}
"""


def size(path):
    out = subprocess.run(['sips', '-g', 'pixelWidth', '-g', 'pixelHeight', path], capture_output=True, text=True, check=True).stdout
    vals = dict(l.strip().split(': ') for l in out.splitlines()[1:] if ': ' in l)
    return int(vals['pixelWidth']), int(vals['pixelHeight'])


def make(src, dst, width, q, tmp, jxa):
    """sips: centre-crop anything wider than 16:9, then resample to `width`; ImageIO: encode."""
    t = os.path.join(tmp, 'r.tiff')
    subprocess.run(['sips', '-s', 'format', 'tiff', src, '--out', t], capture_output=True, check=True)
    w, h = size(t)
    if w / h > MAX_ASPECT:
        subprocess.run(['sips', '-c', str(h), str(round(h * MAX_ASPECT)), t], capture_output=True, check=True)
    subprocess.run(['sips', '--resampleWidth', str(width), t], capture_output=True, check=True)
    r = subprocess.run(['osascript', '-l', 'JavaScript', jxa, t, dst, str(q)], capture_output=True, text=True)
    if r.stdout.strip() != 'ok':
        sys.exit(f'encode failed for {dst}: {r.stderr}')


def credit(m):
    author = ' '.join(m['author'].split())
    for cut in (' from ', ' (', ' at English Wikipedia', ' at en.wikipedia'):
        if cut in author and len(author) > 28:
            author = author.split(cut)[0]
    return f"{author[:48]} · {m['licence']}"


def main():
    meta = json.load(open(META)) if os.path.exists(META) else {}
    jobs = {}
    for pid, m in meta.items():
        if 'error' in m:
            print('skip', pid, m['error'])
            continue
        f = os.path.join(SRC, pid + '.jpg')
        if not os.path.exists(f):
            print('missing', f)
            continue
        lic = m['licence']
        url = m.get('licenceUrl') or ''
        if lic.lower().startswith('public domain') or lic.upper() == 'PD':
            url = PD_URL
        elif lic.upper().startswith('CC0'):
            url = url or CC0_URL
        jobs[pid] = {'file': f, 'credit': credit(m), 'page': m['page'], 'licence': url}
    for pid, e in EXTRA.items():
        if os.path.exists(e['file']):
            jobs[pid] = e
    os.makedirs(OUT, exist_ok=True)
    out, keep, total = {}, set(), 0
    with tempfile.TemporaryDirectory() as tmp:
        jxa = os.path.join(tmp, 'enc.js')
        open(jxa, 'w').write(JXA)
        for pid in sorted(jobs):
            e = jobs[pid]
            h8 = hashlib.sha1(open(e['file'], 'rb').read()).hexdigest()[:8]
            n1, n2, nt = f'{pid}-{h8}.jpg', f'{pid}-{h8}@2x.jpg', f'{pid}-{h8}-t.jpg'
            p1, p2, pt = os.path.join(OUT, n1), os.path.join(OUT, n2), os.path.join(OUT, nt)
            # List thumbnails are 38 px squares: at 3x that is 114 px tall, and a 16:9 crop needs
            # 208 px of width to cover it. The 480 px file was 10x the bytes for those rows.
            if not os.path.exists(pt):
                make(e['file'], pt, WT, Q2, tmp, jxa)
            if not os.path.exists(p2):
                make(e['file'], p2, W2, Q2, tmp, jxa)
            if not os.path.exists(p1):
                make(e['file'], p1, W1, Q1, tmp, jxa)
            w, h = size(p1)
            keep |= {n1, n2, nt}
            total += os.path.getsize(p1) + os.path.getsize(p2) + os.path.getsize(pt)
            out[pid] = {'src': 'images/nz/' + n1, 'src2x': 'images/nz/' + n2, 'thumb': 'images/nz/' + nt, 'w': w, 'h': h,
                        'credit': e['credit'], 'page': e['page'], 'licence': e['licence']}
    for f in os.listdir(OUT):
        if f not in keep:
            os.remove(os.path.join(OUT, f))
            print('removed', f)
    with open(JSON, 'w') as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(',', ':'), sort_keys=True)
        fh.write('\n')
    one = sum(os.path.getsize(os.path.join(ROOT, v['src'])) for v in out.values())
    print(f'{len(out)} photos · 1x {one / 1024:.0f} KB · 1x+2x {total / 1024:.0f} KB · photos.json {os.path.getsize(JSON) / 1024:.1f} KB')


if __name__ == '__main__':
    main()
