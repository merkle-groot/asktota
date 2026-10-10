#!/usr/bin/env python3
"""Lay posts onto a fixed cadence, one every N days, in the order given.

    python3 .blogtools/reschedule.py --start 2026-11-03 slug-a slug-b slug-c
    python3 .blogtools/reschedule.py --start 2026-11-03 --every 2 --dry-run slug-a slug-b
    python3 .blogtools/reschedule.py --append slug-x slug-y   # continue after the last queued post

Writes `published` and `modified` together, so the dateModified schema can never sit
before the publish date. The visible byline is derived from `published` in build.py,
so there is no third field to forget. Only generated posts (.blogtools/posts/) can be
moved; the hand-written legacy posts keep their dates.

Moving a post that is already live to a future date takes it off the site on the next
publish run. The script says so before it writes anything.
"""
import argparse, datetime, json, pathlib, sys
from zoneinfo import ZoneInfo

TOOLS = pathlib.Path(__file__).resolve().parent
POSTS = TOOLS / 'posts'
BLOG = TOOLS.parent / 'blog'
IST = ZoneInfo('Asia/Kolkata')


def load(slug):
    p = POSTS / f'{slug}.json'
    if not p.exists():
        raise SystemExit(f'no such post: {p.relative_to(TOOLS.parent)}')
    return p, json.loads(p.read_text())


def main():
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument('--start', help='YYYY-MM-DD for the first slug')
    g.add_argument('--append', action='store_true', help='start N days after the latest published date')
    ap.add_argument('--every', type=int, default=2, help='days between posts (default 2)')
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('slugs', nargs='+')
    a = ap.parse_args()

    if len(set(a.slugs)) != len(a.slugs):
        raise SystemExit('a slug is listed twice')
    loaded = [load(s) for s in a.slugs]
    # with --append, the latest date may belong to one of the slugs being moved; exclude them
    if a.append:
        others = [json.loads(p.read_text())['published'] for p in POSTS.glob('*.json')
                  if p.stem not in a.slugs]
        if not others:
            raise SystemExit('--append needs at least one other post to follow. use --start.')
        start = datetime.date.fromisoformat(max(others)) + datetime.timedelta(days=a.every)
    else:
        start = datetime.date.fromisoformat(a.start)
    today = datetime.datetime.now(IST).date()

    for i, (slug, (path, meta)) in enumerate(zip(a.slugs, loaded)):
        new = (start + datetime.timedelta(days=i * a.every)).isoformat()
        old = meta['published']
        live = (BLOG / f'{slug}.html').exists()
        note = '  (live now, will be taken down until then)' if live and new > today.isoformat() else ''
        print(f'{old} -> {new}  {slug}{note}')
        if a.dry_run:
            continue
        meta['published'] = new
        meta['modified'] = new
        meta.pop('byline_date', None)
        path.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + '\n')

    if a.dry_run:
        print('\ndry run. nothing written.')
    else:
        print(f'\nrescheduled {len(a.slugs)} post(s). run publish_site.py to apply.')


if __name__ == '__main__':
    main()
