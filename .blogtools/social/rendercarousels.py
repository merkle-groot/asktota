#!/usr/bin/env python3
"""Screenshots one deck out of carousels.html into assets/social/carousels/.

    python3 gen.py                                  # rebuild carousels.html first
    python3 rendercarousels.py 13 saturn-return     # -> 13_unscheduled_saturn-return/01.png ...

Slides are 1080x1350 (4:5). Writes caption.md from the deck's title, blog and
caption fields in decks.json. Decks that get a date later are renamed by hand;
the number stays.
"""
import json, pathlib, shutil, subprocess, sys, tempfile

ROOT = pathlib.Path(__file__).resolve().parent
SITE = ROOT.parent.parent
BROWSE = pathlib.Path.home() / '.claude/skills/gstack/browse/dist/browse'


def browse(*args):
    subprocess.run([str(BROWSE), *args], capture_output=True, text=True, check=True)


def main():
    n, key = int(sys.argv[1]), sys.argv[2]
    deck = json.loads((ROOT / 'decks.json').read_text())[key]
    out = SITE / 'assets/social/carousels' / f'{n:02d}_unscheduled_{key}'
    out.mkdir(parents=True, exist_ok=True)
    browse('viewport', '1080x1350')
    browse('goto', f'file://{ROOT}/carousels.html')
    browse('js', 'document.fonts.ready.then(()=>1)')
    slides = len(deck['slides'])
    # browse only writes under its cwd or /private/tmp, so stage there and move
    tmp = pathlib.Path(tempfile.mkdtemp(prefix=f'asktota-deck-{key}-', dir='/private/tmp'))
    for i in range(1, slides + 1):
        browse('screenshot', f'#{key}-{i:02d}', str(tmp / f'{i:02d}.png'))
        shutil.move(tmp / f'{i:02d}.png', out / f'{i:02d}.png')
    got = len(list(out.glob('*.png')))
    assert got == slides, f'{key}: {got} slides on disk, expected {slides}'
    (out / 'caption.md').write_text(
        f'# Carousel {n} — {deck["title"]}\n\n| | |\n|---|---|\n'
        f'| **Post on** | not scheduled. use it when a slot opens. |\n'
        f'| **Slides** | {slides}, in the order numbered |\n'
        f'| **Size** | 1080 x 1350 (4:5) |\n'
        f'| **Blog post** | {deck["blog"]} |\n\n## Caption\n\n```\n{deck["caption"]}\n```\n')
    print(f'{out.relative_to(SITE)}  {slides} slides')


if __name__ == '__main__':
    main()
