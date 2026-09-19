#!/usr/bin/env python3
"""Renders any self-contained reel-*.html template to an mp4.

The template exposes `render(frame)`, `TOTAL`, and `SFX` on window. SFX is a list
of [sound, frame, volume] placed on the exact frame the thing happens, so the
timing lives next to the animation it belongs to and cannot drift from it.

    python3 genreel.py tier-list 09     # reel-tier-list.html -> assets/social/reels/09_tier-list/
    python3 genreel.py red-flag 10

Frames are screenshotted through gstack browse in verified batches (see
reelshot.py), then encoded with an SFX bed built from audio/. Decks that share a template (the ask tota screens)
still go through genaskreels.py.
"""
import json, pathlib, subprocess, sys, tempfile

from reelshot import browse, capture, open_page

ROOT = pathlib.Path(__file__).resolve().parent
SITE = ROOT.parent.parent
FPS = 30


def render_frames(slug, out):
    open_page(f'file://{ROOT}/reel-{slug}.html')
    meta = json.loads(browse('js', 'JSON.stringify({total:TOTAL, sfx:SFX})'))
    capture(meta['total'], out, label=f'{slug}: ')
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
    slug, n = sys.argv[1], int(sys.argv[2])
    tmp = pathlib.Path(tempfile.mkdtemp(prefix=f'asktota-reel-{slug}-', dir='/private/tmp'))
    frames = tmp / 'frames'
    print(f'{slug}: rendering', flush=True)
    total, sfx = render_frames(slug, frames)
    bed = tmp / 'bed.wav'
    build_sfx(bed, total, sfx)
    mp4 = SITE / 'assets/social/reels' / f'{n:02d}_{slug}' / f'reel-{slug}.mp4'
    encode(frames, bed, mp4)
    print(f'  {total} frames  {mp4.relative_to(SITE)}  {mp4.stat().st_size // 1024} KB', flush=True)


if __name__ == '__main__':
    main()
