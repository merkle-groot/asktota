#!/usr/bin/env python3
"""Renders any self-contained reel-*.html template to an mp4.

The template exposes `render(frame)`, `TOTAL`, and `SFX` on window. SFX is a list
of [sound, frame, volume] placed on the exact frame the thing happens, so the
timing lives next to the animation it belongs to and cannot drift from it.

    python3 genreel.py tier-list 09     # reel-tier-list.html -> assets/social/reels/09_tier-list/
    python3 genreel.py red-flag 10

Frames are screenshotted one at a time through gstack browse, then encoded with
an SFX bed built from audio/. Decks that share a template (the ask tota screens)
still go through genaskreels.py.
"""
import json, pathlib, subprocess, sys, tempfile

ROOT = pathlib.Path(__file__).resolve().parent
SITE = ROOT.parent.parent
BROWSE = pathlib.Path.home() / '.claude/skills/gstack/browse/dist/browse'
FPS = 30


def browse(*args):
    out = subprocess.run([str(BROWSE), *args], capture_output=True, text=True).stdout.strip().splitlines()
    return out[-1] if out else ''   # `render(f)` returns undefined, which prints nothing


def render_frames(slug, out):
    out.mkdir(parents=True, exist_ok=True)
    browse('viewport', '1080x1920')
    browse('goto', f'file://{ROOT}/reel-{slug}.html')
    browse('js', 'document.fonts.ready.then(()=>1)')
    meta = json.loads(browse('js', 'JSON.stringify({total:TOTAL, sfx:SFX})'))
    total = meta['total']
    for f in range(total):
        browse('js', f'render({f})')
        browse('screenshot', '#stage', str(out / f'f{f:04d}.png'))
    n = len(list(out.glob('*.png')))
    assert n == total, f'{slug}: rendered {n} frames, expected {total}'
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
