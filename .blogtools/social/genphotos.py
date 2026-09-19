#!/usr/bin/env python3
"""Resolves subject photos for the STAR FILES reels.

Same source the app itself uses for celebrity portraits: Wikidata P18 -> a file
on Wikimedia Commons. That matters for two reasons. The birth data on the slate
and the face on the card then come from the same record, so they cannot drift.
And a Commons file carries a licence we can actually name, which a press photo
lifted off a search page does not.

    python3 genphotos.py                  # every subject in photos.json
    python3 genphotos.py virat-kohli      # just this one
    python3 genphotos.py --find "shubman gill"    # look up a qid, write nothing

Writes photos/<slug>.jpg (900x1100, face-weighted crop) and records the licence
in photo-credits.json. A subject with no Commons photo is not an error: it is
left out, and reel-star-file.html falls back to the redacted plate on its own.
Drop a file in photos/ by hand with the right name and it is picked up as is.
"""
import json, pathlib, subprocess, sys, urllib.parse, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent
PHOTOS = ROOT / 'photos'
# Wikimedia rejects a default python User-Agent outright, same as it rejects the
# Android image loader. See app/utils/wikimediaImage.ts for the app-side version.
UA = {'User-Agent': 'asktota-social/1.0 (https://asktota.com; contact via asktota.com)'}
# 3:4, because the card slot is 3:4. Crop is anchored above centre: a cricket or
# red carpet photo puts the head in the top third and a centre crop beheads it.
W, H, HEAD_BIAS = 900, 1100, 0.34


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


def crop(src_url, dest):
    """Download, then scale-and-crop to the card slot with ffmpeg.

    increase/crop rather than a plain scale, so a wide action shot fills the
    slot instead of being letterboxed into it.
    """
    raw = dest.with_suffix('.raw')
    req = urllib.request.Request(src_url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r, raw.open('wb') as f:
        f.write(r.read())
    vf = (f'scale={W}:{H}:force_original_aspect_ratio=increase,'
          f'crop={W}:{H}:(iw-{W})/2:(ih-{H})*{HEAD_BIAS},setsar=1')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(raw),
                    '-vf', vf, '-q:v', '2', str(dest)], check=True)
    raw.unlink()


def main():
    args = sys.argv[1:]
    if args and args[0] == '--find':
        for qid, label, desc in find(' '.join(args[1:])):
            print(f'  {qid:12s} {label:28s} {desc}')
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
        crop(info['src'], dest)
        credits[slug] = {'name': ent['label'], 'wikidata': s['wikidata'],
                         'dob': (ent['dob'] or '')[1:11], **info}
        print(f'{slug}: {dest.stat().st_size // 1024} KB  {info["licence"]}  {info["author"][:40]}')

    credits_path.write_text(json.dumps(credits, indent=2, ensure_ascii=False) + '\n')


if __name__ == '__main__':
    main()
