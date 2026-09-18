#!/usr/bin/env python3
"""Renders the callout reels from reel-callout.json.

One template, N decks, same as genaskreels.py. The deck decides the card count,
so the timeline length and the SFX bed both come back out of the page after
setDeck rather than being hardcoded here.

    python3 gencallout.py                 # every deck
    python3 gencallout.py moon-2am        # just this one

Frames are screenshotted one at a time through gstack browse, then encoded with
an SFX bed built from audio/.
"""
import json, pathlib, subprocess, sys, tempfile

ROOT = pathlib.Path(__file__).resolve().parent
SITE = ROOT.parent.parent
BROWSE = pathlib.Path.home() / '.claude/skills/gstack/browse/dist/browse'
FPS = 30

# reel folder numbers. 01 to 12 are taken, see assets/social/reels/.
ORDER = {'moon-2am': 13, 'group-chat': 14}


def browse(*args):
    out = subprocess.run([str(BROWSE), *args], capture_output=True, text=True).stdout.strip().splitlines()
    return out[-1] if out else ''


def render_frames(deck, out):
    out.mkdir(parents=True, exist_ok=True)
    browse('viewport', '1080x1920')
    browse('goto', f'file://{ROOT}/reel-callout.html')
    browse('js', 'document.fonts.ready.then(()=>1)')
    meta = json.loads(browse('js', f'JSON.stringify(setDeck({json.dumps(deck)}))'))
    total = meta['total']
    for f in range(total):
        browse('js', f'render({f})')
        browse('screenshot', '#stage', str(out / f'f{f:04d}.png'))
    n = len(list(out.glob('*.png')))
    assert n == total, f'{deck["slug"]}: rendered {n} frames, expected {total}'
    return total, meta['sfx']


def build_sfx(path, total, events):
    ins, legs, mix = [], '', ''
    for i, (name, f, vol) in enumerate(events):
        ins += ['-i', str(ROOT / 'audio' / f'{name}.wav')]
        ms = round(f / FPS * 1000)
        legs += f'[{i}]adelay={ms}|{ms},volume={vol}[a{i}];'
        mix += f'[a{i}]'
    dur = total / FPS
    filt = (f'{legs}{mix}amix=inputs={len(events)}:normalize=0:duration=longest[m];'
            f'[m]apad,atrim=0:{dur},alimiter=limit=0.94[out]')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *ins, '-filter_complex', filt,
                    '-map', '[out]', '-ar', '44100', '-ac', '2', str(path)], check=True)


def encode(frames, sfx, mp4):
    mp4.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run([
        'ffmpeg', '-v', 'error', '-y',
        '-framerate', str(FPS), '-i', str(frames / 'f%04d.png'),
        '-i', str(sfx), '-shortest',
        '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.0', '-pix_fmt', 'yuv420p',
        '-crf', '18', '-r', str(FPS), '-movflags', '+faststart',
        '-c:a', 'aac', '-b:a', '128k', str(mp4)], check=True)


def main():
    data = json.loads((ROOT / 'reel-callout.json').read_text())
    want = sys.argv[1:] or list(data['decks'])
    tmp = pathlib.Path(tempfile.mkdtemp(prefix='asktota-callout-', dir='/private/tmp'))
    for key in want:
        deck = data['decks'][key]
        frames = tmp / key
        print(f'{key}: rendering', flush=True)
        total, sfx = render_frames(deck, frames)
        bed = tmp / f'{key}.wav'
        build_sfx(bed, total, sfx)
        mp4 = SITE / 'assets/social/reels' / f'{ORDER[key]:02d}_{key}' / f'reel-{key}.mp4'
        encode(frames, bed, mp4)
        print(f'  {total} frames  {total/FPS:.1f}s  {mp4.relative_to(SITE)}  '
              f'{mp4.stat().st_size // 1024} KB', flush=True)


if __name__ == '__main__':
    main()
