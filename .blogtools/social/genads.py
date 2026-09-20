#!/usr/bin/env python3
"""Renders the paid install creatives from ads.json.

One ad definition, every size Meta actually places. A square for feed and a 9:16
for stories and reels covers the placements that matter; running one size means
Meta crops the other and the hook loses its bottom line.

    python3 genads.py                 # every ad, every size
    python3 genads.py birth-time      # just this one

Writes assets/social/ads/<slug>/<slug>-<size>.png. PNG rather than JPG because
these are flat brand colours with hard type edges, which is exactly where JPEG
ringing shows.
"""
import json, pathlib, shutil, subprocess, sys, tempfile

from reelshot import browse, chain

ROOT = pathlib.Path(__file__).resolve().parent
SITE = ROOT.parent.parent
OUT = SITE / 'assets/social/ads'
SIZES = {'sq': '1080x1080', 'st': '1080x1920'}


def render(ad, size, dest, tmp):
    """Shoot into tmp, then move into place.

    browse refuses to write outside /private/tmp and its own launch directory,
    and it says so on stdout while still exiting 0. assets/social/ads is outside
    both, so a screenshot aimed straight at dest silently produces nothing. The
    reel generators already stage frames in tmp for the same reason.
    """
    staged = tmp / f'{ad["slug"]}-{size}.png'
    for attempt in range(2):
        r = chain([['viewport', SIZES[size]],
                   ['js', f'setSize({json.dumps(size)})'],
                   ['js', f'JSON.stringify(setAd({json.dumps(ad)}))'],
                   ['screenshot', '#stage', str(staged)]])
        if staged.exists() and staged.stat().st_size:
            shutil.move(str(staged), str(dest))
            return dest
    # surface what browse actually said rather than just the symptom
    raise RuntimeError(f'{ad["slug"]} {size}: screenshot never landed.\n'
                       f'browse said: {r.stdout.strip()[-300:] or r.stderr.strip()[-300:]}')


def main():
    data = json.loads((ROOT / 'ads.json').read_text())
    want = sys.argv[1:] or list(data['ads'])
    tmp = pathlib.Path(tempfile.mkdtemp(prefix='asktota-ads-', dir='/private/tmp'))
    browse('viewport', '1080x1920')
    browse('goto', f'file://{ROOT}/ads.html')
    browse('js', 'document.fonts.ready.then(()=>1)')
    for key in want:
        ad = data['ads'][key]
        folder = OUT / key
        folder.mkdir(parents=True, exist_ok=True)
        for size in SIZES:
            dest = folder / f'{key}-{size}.png'
            render(ad, size, dest, tmp)
            print(f'  {dest.relative_to(SITE)}  {dest.stat().st_size // 1024} KB', flush=True)


if __name__ == '__main__':
    main()
