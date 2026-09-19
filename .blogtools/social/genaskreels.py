#!/usr/bin/env python3
"""Renders the four "ask tota" screen reels from reel-ask-tota.json.

Each deck is the same 270 frame timeline in reel-ask-tota.html with different
copy injected, so all four stay in sync: fix the template once, re-run, get four
corrected reels. Frames are screenshotted through gstack browse in verified
batches (see reelshot.py), then encoded with an SFX bed built from audio/.

    python3 genaskreels.py            # all four
    python3 genaskreels.py ex jobs    # just these

The reading text in the decks is illustrative. It is a mock of what an answer
looks like, not a reading of anyone's chart, and each notes.md says so.
"""
import json, pathlib, subprocess, sys, os, tempfile

from reelshot import browse, capture, open_page

ROOT = pathlib.Path(__file__).resolve().parent
SITE = ROOT.parent.parent
TOTAL = 270
FPS = 30

# reel folder order. 09 and 10 are the tier list and red flag reels (genreel.py).
ORDER = {'jobs': 5, 'situationship': 6, 'ex': 7, 'money': 8, 'quit': 11, 'marriage': 12}

# every sound is placed on the exact frame the thing happens. matches the T table
# in reel-ask-tota.html; if that retimes, retime this.
def sfx_events():
    ev = [('click', f, 0.30) for f in range(10, 88, 4)]     # the keyboard
    ev += [('thud', 90, 0.95)]                              # send
    ev += [('whoosh', 128, 0.7)]                            # the answer card lands
    ev += [('click', f, 0.55) for f in (146, 160, 174)]     # each line
    ev += [('thud', 190, 0.8)]                              # the mask drops
    ev += [('stamp', 222, 1.0)]                             # the CTA
    return ev


def render_frames(deck, out):
    open_page(f'file://{ROOT}/reel-ask-tota.html')
    browse('js', f'setDeck({json.dumps(deck)}); 1')
    capture(TOTAL, out, label=f'{deck["slug"]}: ')


def build_sfx(path):
    ev = sfx_events()
    ins, legs, mix = [], '', ''
    for i, (name, f, vol) in enumerate(ev):
        ins += ['-i', str(ROOT / 'audio' / f'{name}.wav')]
        ms = round(f / FPS * 1000)
        legs += f'[{i}]adelay={ms}|{ms},volume={vol}[a{i}];'
        mix += f'[a{i}]'
    dur = TOTAL / FPS
    filt = (f'{legs}{mix}amix=inputs={len(ev)}:normalize=0:duration=longest[m];'
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
    data = json.loads((ROOT / 'reel-ask-tota.json').read_text())
    want = sys.argv[1:] or list(data['decks'])
    tmp = pathlib.Path(tempfile.mkdtemp(prefix='asktota-reels-', dir='/private/tmp'))
    sfx = tmp / 'bed.wav'
    build_sfx(sfx)
    for key in want:
        deck = data['decks'][key]
        n = ORDER[key]
        frames = tmp / key
        print(f'{key}: rendering {TOTAL} frames', flush=True)
        render_frames(deck, frames)
        mp4 = (SITE / 'assets/social/reels' /
               f'{n:02d}_ask-tota-{deck["slug"]}' / f'reel-ask-tota-{deck["slug"]}.mp4')
        encode(frames, sfx, mp4)
        print(f'  {mp4.relative_to(SITE)}  {mp4.stat().st_size // 1024} KB', flush=True)


if __name__ == '__main__':
    main()
