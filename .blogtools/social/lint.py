#!/usr/bin/env python3
"""Content rules for the social decks, checked before anything is rendered.

Two rules came straight out of a review of the live account (4 Oct 2026):

1. A carousel's first slide is a hook. Its only job is to stop the scroll, so it
   carries one line and nothing that previews the answer.
2. Minimal content. One idea per slide, a handful of words, no paragraphs.

They are enforced for every deck marked `"format": "minimal"` in decks.json and
every callout reel marked `"minimal": true` in reel-callout.json. The older
decks predate the rules and are left as they shipped.

Two checks apply to everything, old or new, because they are plain bugs:
an HTML entity in the data (the templates write text, so `&middot;` shows up
on screen as `&middot;`), and an em dash in anything a viewer reads.

    python3 lint.py        # check every data file, exit 1 on any problem
"""
import json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent

HOOK_MAX = 10        # words on a carousel cover
HEAD_MAX = 9         # words in a beat headline
SLIDE_MAX = 24       # words on any one beat slide, everything counted
NOTE_MAX = 14        # words in the one supporting line
CTA_MAX = 18         # words on the closing slide
CAPTION_MAX = 45     # caption words before the hashtags
REEL_HOOK_MAX = 8    # words on a reel's opening frame
REEL_LINE_MAX = 9    # words on one reel card
REEL_TAG_MAX = 4
MYTH_COVER_MAX = 10  # words on a myth desk cover
MYTH_MAX = 12        # words in the believed claim
RECEIPTS_MAX = 22    # words in the correction

ENTITY = re.compile(r'&(#\d+|[a-zA-Z]+);')
MARKS = re.compile(r'\*\*|~~|\+\+')


def words(*parts):
    n = 0
    for p in parts:
        if not p:
            continue
        if isinstance(p, list):
            n += words(*p)
            continue
        n += len([w for w in MARKS.sub('', str(p)).replace('·', ' ').split() if w.strip('-.,')])
    return n


def strings(obj, path=''):
    """Every string in a JSON value, with where it lives."""
    if isinstance(obj, str):
        yield path, obj
    elif isinstance(obj, dict):
        for k, v in obj.items():
            yield from strings(v, f'{path}.{k}' if path else k)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            yield from strings(v, f'{path}[{i}]')


def text_bugs(obj, name):
    out = []
    for where, s in strings(obj):
        if ENTITY.search(s):
            out.append(f'{name}: {where}: HTML entity {ENTITY.search(s).group(0)!r} renders literally, use the character')
        if '—' in s:
            out.append(f'{name}: {where}: em dash, rewrite the sentence')
    return out


def caption_words(caption):
    body = caption.split('#', 1)[0]
    return words(body)


def deck(key, d):
    out = []
    say = lambda i, msg: out.append(f'{key} slide {i+1}: {msg}')
    slides = d.get('slides', [])
    if not 4 <= len(slides) <= 8:
        out.append(f'{key}: {len(slides)} slides, minimal decks run 4 to 8')
    if not slides or not slides[0].get('hook'):
        out.append(f'{key}: slide 1 must be a hook slide ("hook": "...")')
    for i, s in enumerate(slides):
        for k in ('copy', 'tiles', 'rows', 'quote', 'save'):
            if k in s:
                say(i, f'"{k}" is not allowed in a minimal deck')
        if s.get('hook'):
            if i:
                say(i, 'only the first slide is a hook')
            if words(s['hook']) > HOOK_MAX:
                say(i, f'hook is {words(s["hook"])} words, max {HOOK_MAX}')
        elif s.get('beat'):
            if not s.get('h'):
                say(i, 'beat slide needs "h"')
            if words(s.get('h')) > HEAD_MAX:
                say(i, f'headline is {words(s.get("h"))} words, max {HEAD_MAX}')
            if words(s.get('note')) > NOTE_MAX:
                say(i, f'note is {words(s.get("note"))} words, max {NOTE_MAX}')
            if len(s.get('list', [])) > 3:
                say(i, 'list runs to 3 items at most')
            total = words(s.get('h'), s.get('big'), s.get('cap'), s.get('list'), s.get('note'))
            if total > SLIDE_MAX:
                say(i, f'{total} words on the slide, max {SLIDE_MAX}')
        elif s.get('cta'):
            c = s['cta']
            if words(c.get('h'), c.get('p'), c.get('btn')) > CTA_MAX:
                say(i, f'closing slide is over {CTA_MAX} words')
        else:
            say(i, 'minimal decks use hook, beat and cta slides only')
    if d.get('caption') and caption_words(d['caption']) > CAPTION_MAX:
        out.append(f'{key}: caption is {caption_words(d["caption"])} words before hashtags, max {CAPTION_MAX}')
    return out


def decks(data):
    out = text_bugs(data, 'decks.json')
    for key, d in data.items():
        if d.get('format') == 'minimal':
            out += deck(key, d)
    return out


def reels(data):
    out = text_bugs(data, 'reel-callout.json')
    for key, d in data.get('decks', {}).items():
        if not d.get('minimal'):
            continue
        hook = d.get('hook', [])
        if words(hook) > REEL_HOOK_MAX:
            out.append(f'{key}: reel hook is {words(hook)} words, max {REEL_HOOK_MAX}')
        if d.get('sub'):
            out.append(f'{key}: minimal reels carry no standing sub line')
        for i, c in enumerate(d.get('cards', [])):
            if words(c.get('line')) > REEL_LINE_MAX:
                out.append(f'{key} card {i+1}: line is {words(c.get("line"))} words, max {REEL_LINE_MAX}')
            if words(c.get('tag')) > REEL_TAG_MAX:
                out.append(f'{key} card {i+1}: tag is over {REEL_TAG_MAX} words')
            if c.get('sub'):
                out.append(f'{key} card {i+1}: minimal cards carry no sub line')
        cap = d.get('caption')
        if cap and caption_words(cap) > CAPTION_MAX:
            out.append(f'{key}: caption is {caption_words(cap)} words before hashtags, max {CAPTION_MAX}')
    return out


def myths(data):
    """Weeks carrying a `cover` line are the rewritten ones and get the rules."""
    out = text_bugs(data, 'myths.json')
    for w in data.get('weeks', []):
        if not w.get('cover'):
            continue
        key = f'myth desk w{w["n"]:02d}'
        if words(w['cover']) > MYTH_COVER_MAX:
            out.append(f'{key}: cover is {words(w["cover"])} words, max {MYTH_COVER_MAX}')
        for m in w['myths']:
            if words(m['myth']) > MYTH_MAX:
                out.append(f'{key} {m["id"]}: myth is {words(m["myth"])} words, max {MYTH_MAX}')
            if words(m['receipts']) > RECEIPTS_MAX:
                out.append(f'{key} {m["id"]}: receipts are {words(m["receipts"])} words, max {RECEIPTS_MAX}')
    return out


def everything():
    out = decks(json.loads((ROOT / 'decks.json').read_text()))
    out += reels(json.loads((ROOT / 'reel-callout.json').read_text()))
    out += text_bugs(json.loads((ROOT / 'star-files.json').read_text()), 'star-files.json')
    out += myths(json.loads((ROOT / 'myths.json').read_text()))
    return out


if __name__ == '__main__':
    problems = everything()
    for p in problems:
        print(p)
    print(f'{len(problems)} problem(s)')
    sys.exit(1 if problems else 0)
