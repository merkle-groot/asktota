#!/usr/bin/env python3
"""Resolves subject photos for the STAR FILES reels.

Same source the app itself uses for celebrity portraits: Wikidata P18 -> a file
on Wikimedia Commons. That matters for two reasons. The birth data on the slate
and the face on the card then come from the same record, so they cannot drift.
And a Commons file carries a licence we can actually name, which a press photo
lifted off a search page does not.

    python3 genphotos.py                  # every subject in photos.json
    python3 genphotos.py virat-kohli      # just this one
    python3 genphotos.py --find "shubman gill"      # look up a qid, write nothing
    python3 genphotos.py --add <slug> <file>        # a photo you sourced yourself

A subject whose head is not near the middle gets a "crop" object in photos.json,
e.g. {"x": 0.29}, which slides the crop window rather than hand cropping the
file. Re-running then reproduces the same framing instead of losing it.

Writes photos/<slug>.jpg (900x1100, face-weighted crop) and records the licence
in photo-credits.json. A subject with no Commons photo is not an error: it is
left out, and reel-star-file.html falls back to the redacted plate on its own.

--add takes a photo you sourced yourself through the identical crop, so a manual
subject is framed the same as a resolved one rather than by hand. It records the
subject as an unverified licence, because a file handed over off-platform does
not carry one: whoever adds it owns that call, and photo-credits.json says so
out loud rather than implying a licence nobody checked.
"""
import json, pathlib, subprocess, sys, urllib.parse, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent
PHOTOS = ROOT / 'photos'
# Wikimedia rejects a default python User-Agent outright, same as it rejects the
# Android image loader. See app/utils/wikimediaImage.ts for the app-side version.
UA = {'User-Agent': 'asktota-social/1.0 (https://asktota.com; contact via asktota.com)'}
# 3:4, because the card slot is 3:4. The default crop is anchored above centre:
# a cricket or red carpet photo puts the head in the top third and a centre crop
# beheads it. A subject standing off to one side needs the horizontal anchor
# moved too, so both are overridable per subject via "crop" in photos.json.
W, H = 900, 1100
BIAS = {'x': 0.5, 'y': 0.34}    # 0 is left/top, 1 is right/bottom


def api(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
        return json.load(r)


def find(name):
    """Wikidata entity search. Prints candidates; picking one is a human job."""
    url = ('https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json'
           f'&language=en&limit=8&search={urllib.parse.quote(name)}')
    return [(r['id'], r.get('label', ''), r.get('description', '')) for r in api(url)['search']]


def entity(qid):
    url = ('https://www.wikidata.org/w/api.php?action=wbgetentities&format=json'
           f'&ids={qid}&props=claims|labels&languages=en')
    e = api(url)['entities'][qid]
    claims = e.get('claims', {})

    def one(prop, path):
        for st in claims.get(prop, []):
            v = st['mainsnak'].get('datavalue', {}).get('value')
            if v is not None:
                return v[path] if path and isinstance(v, dict) else v
        return None

    return {
        'label': e.get('labels', {}).get('en', {}).get('value'),
        'image': one('P18', None),
        'dob': one('P569', 'time'),
    }


def commons(filename):
    """imageinfo for a Commons file: a big thumbnail plus the licence fields."""
    url = ('https://commons.wikimedia.org/w/api.php?action=query&format=json'
           f'&titles={urllib.parse.quote("File:" + filename)}'
           '&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1400')
    pages = api(url)['query']['pages']
    info = next(iter(pages.values()))['imageinfo'][0]
    meta = info.get('extmetadata', {})

    def txt(key):
        v = str(meta.get(key, {}).get('value', ''))
        # extmetadata ships HTML in Artist and Credit. Flatten it to a name.
        out, depth = [], 0
        for ch in v:
            if ch == '<':
                depth += 1
            elif ch == '>':
                depth -= 1
            elif depth == 0:
                out.append(ch)
        return ' '.join(''.join(out).split())

    return {
        'file': filename,
        'src': info['thumburl'],
        'page': info['descriptionurl'],
        'licence': txt('LicenseShortName'),
        'author': txt('Artist') or txt('Credit'),
    }


def crop_filter(bias):
    """scale-then-crop, so a wide action shot fills the slot rather than
    being letterboxed into it. bias slides the crop window over the scaled
    image: 0.5 is centred, lower is left or up."""
    b = {**BIAS, **(bias or {})}
    return (f'scale={W}:{H}:force_original_aspect_ratio=increase,'
            f'crop={W}:{H}:(iw-{W})*{b["x"]}:(ih-{H})*{b["y"]},setsar=1')


def crop_to_slot(src, dest, bias=None):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(src),
                    '-vf', crop_filter(bias), '-q:v', '2', str(dest)], check=True)


def fetch_and_crop(src_url, dest, bias=None):
    raw = dest.with_suffix('.raw')
    req = urllib.request.Request(src_url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r, raw.open('wb') as f:
        f.write(r.read())
    crop_to_slot(raw, dest, bias)
    raw.unlink()


def add_manual(slug, src):
    """Take a photo sourced off-platform through the same crop as a resolved one."""
    src = pathlib.Path(src).expanduser()
    if not src.exists():
        sys.exit(f'no such file: {src}')
    PHOTOS.mkdir(exist_ok=True)
    dest = PHOTOS / f'{slug}.jpg'
    subjects = json.loads((ROOT / 'photos.json').read_text())['subjects']
    crop_to_slot(src, dest, subjects.get(slug, {}).get('crop'))
    credits_path = ROOT / 'photo-credits.json'
    credits = json.loads(credits_path.read_text()) if credits_path.exists() else {}
    credits[slug] = {'source': 'supplied by hand', 'file': src.name,
                     'licence': 'UNVERIFIED', 'author': 'unknown',
                     'note': 'Not resolved from Wikidata or Commons. Nobody has checked '
                             'what this may be used for; whoever added it owns that call.'}
    credits_path.write_text(json.dumps(credits, indent=2, ensure_ascii=False) + '\n')
    print(f'{slug}: {dest.stat().st_size // 1024} KB  licence UNVERIFIED  from {src.name}')


def main():
    args = sys.argv[1:]
    if args and args[0] == '--find':
        for qid, label, desc in find(' '.join(args[1:])):
            print(f'  {qid:12s} {label:28s} {desc}')
        return
    if args and args[0] == '--add':
        if len(args) != 3:
            sys.exit('usage: genphotos.py --add <slug> <file>')
        add_manual(args[1], args[2])
        return

    subjects = json.loads((ROOT / 'photos.json').read_text())['subjects']
    want = args or list(subjects)
    PHOTOS.mkdir(exist_ok=True)
    credits_path = ROOT / 'photo-credits.json'
    credits = json.loads(credits_path.read_text()) if credits_path.exists() else {}

    for slug in want:
        s = subjects[slug]
        dest = PHOTOS / f'{slug}.jpg'
        if s.get('manual'):
            state = 'on disk' if dest.exists() else 'MISSING, renders redacted'
            print(f'{slug}: manual, {state}')
            continue
        ent = entity(s['wikidata'])
        if not ent['image']:
            credits.pop(slug, None)
            print(f'{slug}: no Commons photo on {s["wikidata"]}, renders redacted')
            continue
        info = commons(ent['image'])
        fetch_and_crop(info['src'], dest, s.get('crop'))
        credits[slug] = {'name': ent['label'], 'wikidata': s['wikidata'],
                         'dob': (ent['dob'] or '')[1:11], **info}
        print(f'{slug}: {dest.stat().st_size // 1024} KB  {info["licence"]}  {info["author"][:40]}')

    credits_path.write_text(json.dumps(credits, indent=2, ensure_ascii=False) + '\n')


if __name__ == '__main__':
    main()
