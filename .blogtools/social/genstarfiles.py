#!/usr/bin/env python3
"""Renders the callout reels from star-files.json.

One template, N decks, same as genaskreels.py. The deck decides the card count,
so the timeline length and the SFX bed both come back out of the page after
setDeck rather than being hardcoded here.

    python3 genstarfiles.py                    # every deck
    python3 genstarfiles.py abhishek-sharma    # just this one

Subject photos come out of photos/, filled by genphotos.py. A subject with no
file there renders the redacted plate, which is a supported state.

Frames are screenshotted through gstack browse in verified batches (see
reelshot.py), then encoded with an SFX bed built from audio/.
"""
import json, pathlib, subprocess, sys, tempfile

from reelshot import browse, capture, open_page

ROOT = pathlib.Path(__file__).resolve().parent
SITE = ROOT.parent.parent
FPS = 30

# reel folder numbers. 01 to 14 and 16 are taken, see assets/social/reels/.
ORDER = {'abhishek-sharma': 15, 'kohli-rohit': 17}
PHOTOS = ROOT / 'photos'


def with_photos(deck):
    """Point every subject at its photo file, or at nothing.

    The deck never names a path. genphotos.py owns photos/, so dropping a
    licensed jpg in there is all it takes to upgrade a redacted file to a
    photo led one, and deleting it is all it takes to go back.
    """
    for subject in ([deck] if deck.get('mode', 'solo') == 'solo' else [deck['a'], deck['b']]):
        f = PHOTOS / f"{subject['slug']}.jpg"
        subject['photo'] = f'photos/{f.name}' if f.exists() else None
    return deck


def render_frames(deck, out):
    open_page(f'file://{ROOT}/reel-star-file.html')
    meta = json.loads(browse('js', f'JSON.stringify(setDeck({json.dumps(with_photos(deck))}))'))
    capture(meta['total'], out, label=f'{deck["slug"]}: ')
    return meta['total'], meta['sfx']


def build_sfx(path, total, events):
    ins, legs, mix = [], '', ''
    for i, (name, f, vol) in enumerate(events):
        ins += ['-i', str(ROOT / 'audio' / f'{name}.wav')]
        ms = round(f / FPS * 1000)
        legs += f'[{i}]adelay={ms}|{ms},volume={vol}[a{i}];'
        mix += f'[a{i}]'
    dur = total / FPS
    # apad with no length generates silence forever, and the atrim below it only
    # discards frames: it does not signal end of stream back up the graph. Whether
    # this returned in a tenth of a second or span at 100% CPU was a race on how
    # amix propagated EOF, and on 19 Sept 2026 it span for fifty minutes on a ten
    # second mix. whole_dur pads to an exact total and then ends the stream.
    filt = (f'{legs}{mix}amix=inputs={len(events)}:normalize=0:duration=longest[m];'
            f'[m]apad=whole_dur={dur},atrim=0:{dur},alimiter=limit=0.94[out]')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *ins, '-filter_complex', filt,
                    '-map', '[out]', '-ar', '44100', '-ac', '2', str(path)],
                   check=True, timeout=120)


def encode(frames, sfx, mp4):
    mp4.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run([
        'ffmpeg', '-v', 'error', '-y',
        '-framerate', str(FPS), '-i', str(frames / 'f%04d.png'),
        '-i', str(sfx), '-shortest',
        '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.0', '-pix_fmt', 'yuv420p',
        '-crf', '18', '-r', str(FPS), '-movflags', '+faststart',
        '-c:a', 'aac', '-b:a', '128k', str(mp4)], check=True, timeout=900)


def main():
    data = json.loads((ROOT / 'star-files.json').read_text())
    want = sys.argv[1:] or list(data['decks'])
    tmp = pathlib.Path(tempfile.mkdtemp(prefix='asktota-starfile-', dir='/private/tmp'))
    for key in want:
        deck = data['decks'][key]
        shot = 'photo' if (PHOTOS / f"{deck.get('slug', key)}.jpg").exists() or deck.get('mode') == 'versus' else 'redacted'
        frames = tmp / key
        print(f'{key}: rendering ({deck.get("mode", "solo")}, {shot})', flush=True)
        total, sfx = render_frames(deck, frames)
        bed = tmp / f'{key}.wav'
        build_sfx(bed, total, sfx)
        mp4 = SITE / 'assets/social/reels' / f'{ORDER[key]:02d}_star-file-{key}' / f'reel-star-file-{key}.mp4'
        encode(frames, bed, mp4)
        print(f'  {total} frames  {total/FPS:.1f}s  {mp4.relative_to(SITE)}  '
              f'{mp4.stat().st_size // 1024} KB', flush=True)


if __name__ == '__main__':
    main()
