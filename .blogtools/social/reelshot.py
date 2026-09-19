"""Shared frame capture for the reel generators.

Every generator had grown its own copy of the same loop, and the copy was wrong
in the same two ways.

It spawned the browse binary twice per frame. That is about 1.6 seconds a frame,
so a twelve second reel took eighteen minutes. browse accepts a `chain` of
commands on stdin, so a whole chunk of frames goes through one process instead
and the same reel takes about a minute.

And it only noticed a dropped screenshot at the very end, by counting files. A
screenshot can fail to land without failing loudly: on 18 Sept 2026 frame 73 of
the abhishek-sharma render simply never appeared, and the assert threw away the
other 327 frames along with it. Here each chunk is verified as it lands and a
missing frame is reshot on its own, so a dropped frame costs a second rather
than the whole run.
"""
import json, pathlib, subprocess

BROWSE = pathlib.Path.home() / '.claude/skills/gstack/browse/dist/browse'
CHUNK = 48        # frames per browse process. 48 keeps one chain under a second.
ATTEMPTS = 3      # first pass, then two reshoot passes, then give up loudly


def browse(*args):
    """One command, last line of stdout. For the few one-shot calls per reel."""
    out = subprocess.run([str(BROWSE), *args], capture_output=True,
                         text=True).stdout.strip().splitlines()
    return out[-1] if out else ''


def chain(cmds):
    """Many commands, one process. cmds is a list of [command, ...args]."""
    return subprocess.run([str(BROWSE), 'chain'], input=json.dumps(cmds),
                          capture_output=True, text=True)


def open_page(url, viewport='1080x1920'):
    chain([['viewport', viewport], ['goto', url],
           ['js', 'document.fonts.ready.then(()=>1)']])


def frame_path(out, f):
    return out / f'f{f:04d}.png'


def dropped(out, frames):
    """Frames with no file, or an empty one. Both are a failed screenshot."""
    bad = []
    for f in frames:
        p = frame_path(out, f)
        if not p.exists() or p.stat().st_size == 0:
            bad.append(f)
    return bad


def capture(total, out, stage='#stage', label='', chunk=CHUNK):
    """Render frames 0..total-1 into out, and do not return until they all exist."""
    out.mkdir(parents=True, exist_ok=True)
    todo = list(range(total))
    for attempt in range(1, ATTEMPTS + 1):
        # a reshoot goes one frame per process: whatever dropped the frame the
        # first time is likelier to be a batching artefact than a page fault
        size = chunk if attempt == 1 else 1
        for i in range(0, len(todo), size):
            cmds = []
            for f in todo[i:i + size]:
                cmds += [['js', f'render({f})'],
                         ['screenshot', stage, str(frame_path(out, f))]]
            chain(cmds)
        todo = dropped(out, todo)
        if not todo:
            return total
        print(f'  {label}reshooting {len(todo)} dropped frame(s): {todo[:8]}', flush=True)
    raise RuntimeError(f'{label}frames never rendered after {ATTEMPTS} attempts: {todo}')
