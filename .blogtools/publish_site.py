#!/usr/bin/env python3
"""Publish the blog by date. Posts stay in the archive until their day arrives.

The site is a static deploy, so "scheduled" has to mean the page genuinely does
not exist yet: no HTML, no sitemap entry, no index card, no schema. This script
is the gate. Run it daily and it releases whatever has come due.

    python3 .blogtools/publish_site.py                 # release anything due today (IST)
    python3 .blogtools/publish_site.py --dry-run       # say what would change, touch nothing
    python3 .blogtools/publish_site.py --as-of 2026-11-01   # what the site looks like that day
    python3 .blogtools/publish_site.py --preview       # build EVERYTHING to .blogtools/preview/

Sources of truth:
    .blogtools/posts/<slug>.json      metadata for every generated post
    .blogtools/legacy-cards.json      card + llms data for the 19 hand-written posts

Everything downstream is regenerated from those: blog/*.html, the archive grid and
its ItemList schema, sitemap.xml, and the Explainers section of llms.txt.
"""
import argparse, datetime, json, pathlib, re, shutil, sys
from zoneinfo import ZoneInfo

ROOT = pathlib.Path(__file__).resolve().parent.parent
TOOLS = ROOT / '.blogtools'
POSTS = TOOLS / 'posts'
BLOG = ROOT / 'blog'
SITE = 'https://www.asktota.com'
IST = ZoneInfo('Asia/Kolkata')

sys.path.insert(0, str(TOOLS))
import build as builder                                   # noqa: E402

ONES = ('zero one two three four five six seven eight nine ten eleven twelve thirteen '
        'fourteen fifteen sixteen seventeen eighteen nineteen').split()
TENS = {20: 'twenty', 30: 'thirty', 40: 'forty', 50: 'fifty', 60: 'sixty',
        70: 'seventy', 80: 'eighty', 90: 'ninety'}


def in_words(n):
    if n < 20:
        return ONES[n]
    if n < 100:
        t, o = divmod(n, 10)
        return TENS[t * 10] + ('-' + ONES[o] if o else '')
    h, r = divmod(n, 100)
    return ONES[h] + ' hundred' + (' and ' + in_words(r) if r else '')


def load_all():
    """Every post, generated and legacy, keyed by slug and sorted newest first."""
    out = {}
    for f in POSTS.glob('*.json'):
        m = json.loads(f.read_text())
        m['slug'], m['generated'] = f.stem, True
        out[f.stem] = m
    for slug, m in json.loads((TOOLS / 'legacy-cards.json').read_text()).items():
        if slug in out:
            raise SystemExit(f'{slug} is defined in both posts/ and legacy-cards.json')
        m = dict(m); m['slug'], m['generated'] = slug, False
        out[slug] = m
    for slug, m in out.items():
        for k in ('published', 'card_title', 'card_dek', 'read_time',
                  'chip', 'llms_title', 'llms_desc'):
            if k not in m:
                raise SystemExit(f'{slug}.json is missing "{k}"')
        # the card date is always derived, so it can never drift from `published`
        d = datetime.date.fromisoformat(m['published'])
        m['card_date'] = f'{d.strftime("%B").lower()} {d.day}, {d.year}'
    return sorted(out.values(), key=lambda m: (m['published'], m['slug']), reverse=True)


def card_html(m, lead):
    chip = ('<span class="chip chip-marigold">latest</span>' if lead else
            f'<span class="chip{" chip-pink" if m["chip"] != "explainer" else ""}">{m["chip"]}</span>')
    return (f'        <a class="archive-card{" archive-card-lead" if lead else ""}" href="{m["slug"]}.html">\n'
            f'          {chip}\n'
            f'          <p class="blog-card-meta">{m["card_date"]} &middot; {m["read_time"]}</p>\n'
            f'          <h3>{m["card_title"]}</h3>\n'
            f'          <p>{m["card_dek"]}</p>\n'
            f'          <span class="blog-card-link">read the story</span>\n'
            f'        </a>\n')


def prune_links(slug, live_slugs):
    """A live post must never link to one still in the archive.

    Read-next entries pointing at a held post are dropped whole. Links inside prose
    are unwrapped so the sentence survives without the href. Both come back on the
    next run once the target is released, because every live post is rebuilt each time.
    """
    p = BLOG / f'{slug}.html'
    s = p.read_text()
    dead = set(re.findall(r'href="([a-z0-9-]+)\.html"', s)) - live_slugs
    if not dead:
        return 0
    for d in dead:
        s = re.sub(rf'<li><a href="{re.escape(d)}\.html">.*?</li>', '', s, flags=re.S)
        s = re.sub(rf'<a href="{re.escape(d)}\.html">(.*?)</a>', r'\1', s, flags=re.S)
    p.write_text(s)
    return len(dead)


def write_index(live):
    p = BLOG / 'index.html'; s = p.read_text()
    cards = '\n'.join(card_html(m, i == 0) for i, m in enumerate(live))
    s = re.sub(r'(<div class="archive-grid">\n).*?(\n      </div>)',
               lambda mm: mm.group(1) + cards + mm.group(2), s, count=1, flags=re.S)

    mm = re.search(r'(<script type="application/ld\+json">\n)(.*?)(\n  </script>)', s, re.S)
    d = json.loads(mm.group(2))
    for g in d['@graph']:
        if g['@type'] == 'ItemList':
            g['numberOfItems'] = len(live)
            g['itemListElement'] = [
                {"@type": "ListItem", "position": i, "url": f"{SITE}/blog/{m['slug']}.html",
                 "name": m['card_title']}
                for i, m in enumerate(live, start=1)]
    body = '\n'.join('  ' + l for l in json.dumps(d, ensure_ascii=False, indent=2).splitlines())
    s = s[:mm.start(2)] + body + s[mm.end(2):]

    word = in_words(len(live))
    s = re.sub(r'\b[A-Z][a-z]+(?:-[a-z]+)? explainers on', f'{word.capitalize()} explainers on', s)
    s = re.sub(r'\b[a-z]+(?:-[a-z]+)? pieces on the parts', f'{word} pieces on the parts', s)
    p.write_text(s)


def write_sitemap(live):
    p = ROOT / 'sitemap.xml'; s = p.read_text()
    keep = [b for b in re.findall(r'  <url>.*?</url>\n', s, re.S) if '/blog/' not in b or '/blog/</loc>' in b]
    blocks = ''.join(
        f'  <url>\n    <loc>{SITE}/blog/{m["slug"]}.html</loc>\n'
        f'    <lastmod>{m.get("modified", m["published"])}</lastmod>\n'
        f'    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>\n'
        for m in live)
    # blog posts sit directly after the blog index entry
    idx = next(i for i, b in enumerate(keep) if '/blog/</loc>' in b)
    newest = live[0].get('modified', live[0]['published']) if live else None
    if newest:
        keep[idx] = re.sub(r'<lastmod>[\d-]+</lastmod>', f'<lastmod>{newest}</lastmod>', keep[idx])
        keep[0] = re.sub(r'<lastmod>[\d-]+</lastmod>', f'<lastmod>{newest}</lastmod>', keep[0])
    out = ('<?xml version="1.0" encoding="UTF-8"?>\n'
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
           + ''.join(keep[:idx + 1]) + blocks + ''.join(keep[idx + 1:]) + '</urlset>\n')
    p.write_text(out)


def write_llms(live):
    p = ROOT / 'llms.txt'; s = p.read_text()
    lines = '\n'.join(f'- [{m["llms_title"]}]({SITE}/blog/{m["slug"]}.html): {m["llms_desc"]}'
                      for m in live)
    s = re.sub(r'(\n## Explainers\n\n).*?(\n\n## Contact\n)',
               lambda mm: mm.group(1) + lines + mm.group(2), s, count=1, flags=re.S)
    s = re.sub(r'\[Blog\]\(https://www\.asktota\.com/blog/\): [a-z-]+ explainers',
               f'[Blog]({SITE}/blog/): {in_words(len(live))} explainers', s)
    p.write_text(s)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--as-of', help='YYYY-MM-DD. defaults to today in IST.')
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--preview', action='store_true',
                    help='build every post, future ones included, into .blogtools/preview/')
    a = ap.parse_args()

    as_of = (datetime.date.fromisoformat(a.as_of) if a.as_of
             else datetime.datetime.now(IST).date())
    everything = load_all()

    if a.preview:
        out = TOOLS / 'preview'
        shutil.rmtree(out, ignore_errors=True); out.mkdir(parents=True)
        for m in everything:
            if m['generated']:
                builder.build(m['slug'], out_dir=out)      # never touches blog/
            elif (BLOG / f'{m["slug"]}.html').exists():
                shutil.copy(BLOG / f'{m["slug"]}.html', out / f'{m["slug"]}.html')
        for extra in ('index.html', 'astro-lib.js', *[p.name for p in BLOG.glob('*widget.js')]):
            if (BLOG / extra).exists():
                shutil.copy(BLOG / extra, out / extra)
        print(f'preview built: {len(everything)} posts in {out.relative_to(ROOT)}/')
        print('nothing published. open the files directly to proofread.')
        return

    live = [m for m in everything if m['published'] <= as_of.isoformat()]
    held = [m for m in everything if m['published'] > as_of.isoformat()]

    releasing = [m for m in live if m['generated'] and not (BLOG / f'{m["slug"]}.html').exists()]
    pulling = [m for m in held if (BLOG / f'{m["slug"]}.html').exists()]

    print(f'as of {as_of}: {len(live)} live, {len(held)} still in the archive')
    for m in releasing:
        print(f'  RELEASE  {m["published"]}  {m["slug"]}')
    for m in pulling:
        print(f'  HOLD     {m["published"]}  {m["slug"]}')
    if not releasing and not pulling:
        print('  nothing to change.')

    if a.dry_run:
        print('\ndry run. nothing written.')
        return

    for m in live:
        if m['generated']:
            builder.build(m['slug'])
    for m in pulling:
        (BLOG / f'{m["slug"]}.html').unlink()

    live_slugs = {m['slug'] for m in live}
    pruned = sum(1 for m in live if prune_links(m['slug'], live_slugs))
    if pruned:
        print(f'  pruned links to held posts in {pruned} live post(s)')

    write_index(live)
    write_sitemap(live)
    write_llms(live)
    print(f'\nwrote blog/index.html, sitemap.xml and llms.txt for {len(live)} posts.')


if __name__ == '__main__':
    main()
