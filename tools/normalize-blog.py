#!/usr/bin/env python3
"""Bring every blog post onto the current site shell.

Safe to re-run. Run it after generating new posts:
    python3 tools/normalize-blog.py

It fixes the favicon block, the Google Play nav pill, the footer tagline, the
blog naming (the Chart Desk is a screen in the app, not the blog), the contact
address, and the publish date. Dates live in SCHEDULE below: every post sits
between 25 July and 18 August 2026, and eclipse-sutak stays before 12 August
because its body is about that eclipse.
"""
import datetime
import glob
import json
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), os.pardir)
BLOG = os.path.join(ROOT, 'blog')
PLAY = 'https://play.google.com/store/apps/details?id=app.asktota'
MODIFIED = '2026-08-18'

SCHEDULE = {
    'what-is-vedic-astrology.html':    '2026-07-25',
    'zodiac-signs.html':               '2026-07-26',
    'nine-planets.html':               '2026-07-28',
    '12-houses.html':                  '2026-07-29',
    'vedic-sun-sign.html':             '2026-07-31',
    'kundli.html':                     '2026-08-01',
    'vedic-vs-western-astrology.html': '2026-08-02',
    'sun-moon-rising.html':            '2026-08-04',
    'birth-time-accuracy.html':        '2026-08-05',
    'nakshatra.html':                  '2026-08-07',
    'panchang.html':                   '2026-08-06',
    'vimshottari-dasha.html':          '2026-08-08',
    'angel-numbers.html':              '2026-08-09',
    'eclipse-sutak.html':              '2026-08-10',
    'sade-sati.html':                  '2026-08-11',
    'manglik-dosha.html':              '2026-08-13',
    'ashtakoota-compatibility.html':   '2026-08-14',
    'festival-dates.html':             '2026-08-16',
    'career-10th-house.html':          '2026-08-18',
}

FAVICONS = (
    '  <link rel="icon" href="/favicon.ico" sizes="any" />\n'
    '  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />\n'
    '  <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96.png" />\n'
    '  <link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png" />\n'
    '  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />\n'
    '  <link rel="manifest" href="/site.webmanifest" />\n'
)

PLAY_GLYPH = (
    '<svg class="play-glyph" viewBox="0 0 24 24" aria-hidden="true">'
    '<path d="M3.6 1.9a1 1 0 0 0-.5.9v18.4a1 1 0 0 0 .5.9l10-10.1zM15 8.4 5.2 1.5l9.1 9.2z'
    'M5.2 22.5l9.8-6.9-.7-.7zM19.9 10.6l-3.3-1.9-2.2 2.2 2.2 2.2 3.3-1.9a1 1 0 0 0 0-1.6z" '
    'fill="currentColor"/></svg>'
)


def normalize(path):
    name = os.path.basename(path)
    s = original = open(path, encoding='utf-8').read()

    # favicons: drop whatever is there, write the current set
    s = re.sub(r'[ \t]*<link rel="(?:icon|apple-touch-icon|manifest)"[^>]*>\n', '', s)
    s = s.replace('  <link rel="stylesheet" href="', FAVICONS + '  <link rel="stylesheet" href="', 1)

    # nav mark is the real app icon
    s = re.sub(r'<img src="(?:\.\./)?assets/tota/loader-parrot-planted\.png" alt="" width="30" height="30" />',
               '<img src="/favicon-96.png" alt="" width="30" height="30" />', s)

    # the app has shipped on Android, so the nav pill links to the store
    s = re.sub(
        r'<a class="nav-cta" href="(?:\.\./)?index\.html#waitlist">\s*'
        r'<span class="nav-dot" aria-hidden="true"></span>\s*coming soon\s*</a>',
        '<a class="nav-cta" href="%s" target="_blank" rel="noopener">\n        %s\n        google play\n      </a>'
        % (PLAY, PLAY_GLYPH), s)

    # "The Chart Desk" is a screen inside the app; the blog is just the blog
    s = s.replace('THE DAILY TOTA &middot; THE CHART DESK &middot; FREE COPY',
                  'THE DAILY TOTA &middot; THE BLOG &middot; FREE COPY')
    s = s.replace('<p class="section-kicker">THE CHART DESK &middot; ', '<p class="section-kicker">THE BLOG &middot; ')
    s = s.replace('<p class="section-kicker">THE CHART DESK · ', '<p class="section-kicker">THE BLOG · ')
    s = s.replace('>chart desk</a>', '>blog</a>')
    s = s.replace('"@id":"https://www.asktota.com/blog/#blog","name":"The Chart Desk"',
                  '"@id":"https://www.asktota.com/blog/#blog","name":"Ask Tota Blog"')
    s = s.replace('"position":2,"name":"The Chart Desk","item":"https://www.asktota.com/blog/"',
                  '"position":2,"name":"Blog","item":"https://www.asktota.com/blog/"')

    s = s.replace('<span>read the stars first, then send the text.</span>', '<span>ur astrology bestie</span>')
    s = s.replace('"url":"https://www.asktota.com/favicon.png"', '"url":"https://www.asktota.com/icon-512.png"')
    s = s.replace('hello@asktota.com', 'hi@asktota.com')

    # article CTA points at the store
    s = s.replace('>get early access to Ask Tota<', '>get it on google play<')
    s = s.replace('>get early access<', '>get it on google play<')
    s = s.replace('href="../index.html#waitlist" class="btn btn-primary"',
                  'href="%s" target="_blank" rel="noopener" class="btn btn-primary"' % PLAY)
    s = s.replace('class="btn btn-primary" href="../index.html#waitlist"',
                  'class="btn btn-primary" target="_blank" rel="noopener" href="%s"' % PLAY)

    # no em dashes, no curly quotes: house style
    s = s.replace('“', '"').replace('”', '"').replace('‘', "'").replace('’', "'")

    # publish date
    iso = SCHEDULE.get(name)
    if iso:
        pretty = datetime.date.fromisoformat(iso).strftime('%B %-d, %Y').upper()
        s = re.sub(r'"datePublished":"\d{4}-\d{2}-\d{2}"', '"datePublished":"%s"' % iso, s)
        s = re.sub(r'"dateModified":"\d{4}-\d{2}-\d{2}"', '"dateModified":"%s"' % MODIFIED, s)
        s = re.sub(r'(<meta property="article:published_time" content=")\d{4}-\d{2}-\d{2}"', r'\g<1>%s"' % iso, s)
        s = re.sub(r'(<meta property="article:modified_time" content=")\d{4}-\d{2}-\d{2}"', r'\g<1>%s"' % MODIFIED, s)
        s = re.sub(r'(<p class="blog-byline">)[A-Z]+ \d{1,2}, \d{4}', r'\g<1>' + pretty, s)

    if s != original:
        open(path, 'w', encoding='utf-8').write(s)
    return name, iso, s != original


def replace_json_object(s, marker, replacement):
    """Swap the JSON object containing `marker`, found by brace matching."""
    at = s.index(marker)
    start = s.rindex('{', 0, at)
    depth, i = 0, start
    while True:
        if s[i] == '{':
            depth += 1
        elif s[i] == '}':
            depth -= 1
            if depth == 0:
                break
        i += 1
    return s[:start] + replacement.lstrip() + s[i + 1:]


def replace_block(s, opening, body):
    """Swap the contents of a div, matching its real closing tag by depth."""
    start = s.index(opening)
    cursor = start + len(opening)
    depth = 1
    while depth:
        nxt_open = s.find('<div', cursor)
        nxt_close = s.find('</div>', cursor)
        if nxt_close == -1:
            raise ValueError('unbalanced ' + opening)
        if nxt_open != -1 and nxt_open < nxt_close:
            depth += 1
            cursor = nxt_open + 4
        else:
            depth -= 1
            cursor = nxt_close + 6
    close = cursor - 6
    indent = '\n      '
    return s[:start + len(opening)] + '\n' + body + indent + s[close:]


CHIP = {'start here': 'chip chip-marigold', 'explainer': 'chip', 'with calculator': 'chip chip-pink'}


def summarise(path):
    """Pull the card fields for the blog index straight out of the post."""
    s = open(path, encoding='utf-8').read()
    name = os.path.basename(path)
    title = re.sub(r'\s+', ' ', re.search(r'<h1>(.*?)</h1>', s, re.S).group(1)).strip()
    dek = re.sub(r'<[^>]+>', '', re.search(r'class="blog-dek">(.*?)</p>', s, re.S).group(1))
    dek = re.sub(r'\s+', ' ', dek).strip()
    # first two sentences is plenty for a card
    parts = re.split(r'(?<=[.!?]) ', dek)
    dek = ' '.join(parts[:2]).strip()
    mins = re.search(r'blog-byline">[^<]*?(\d+)\s*MIN READ', s)
    mins = mins.group(1) if mins else '8'
    tag = 'with calculator' if ('chart-finder-form' in s or 'sun-finder-form' in s) else 'explainer'
    return {'href': name, 'title': title, 'dek': dek, 'mins': mins, 'tag': tag,
            'iso': SCHEDULE[name]}


def rebuild_index(cards):
    path = os.path.join(BLOG, 'index.html')
    s = open(path, encoding='utf-8').read()

    html = []
    for i, c in enumerate(cards):
        lead = ' archive-card-lead' if i == 0 else ''
        chip = 'chip chip-marigold' if i == 0 else CHIP[c['tag']]
        label = 'latest' if i == 0 else c['tag']
        pretty = datetime.date.fromisoformat(c['iso']).strftime('%B %-d, %Y').lower()
        html.append(
            '        <a class="archive-card%s" href="%s">\n'
            '          <span class="%s">%s</span>\n'
            '          <p class="blog-card-meta">%s &middot; %s min read</p>\n'
            '          <h3>%s</h3>\n'
            '          <p>%s</p>\n'
            '          <span class="blog-card-link">read the story</span>\n'
            '        </a>' % (lead, c['href'], chip, label, pretty, c['mins'], c['title'], c['dek']))

    s = replace_block(s, '<div class="archive-grid">', '\n\n'.join(html))

    items = [{'@type': 'ListItem', 'position': n + 1,
              'url': 'https://www.asktota.com/blog/' + c['href'],
              'name': c['title']} for n, c in enumerate(cards)]
    payload = json.dumps({'@type': 'ItemList',
                          'itemListOrder': 'https://schema.org/ItemListOrderDescending',
                          'numberOfItems': len(cards),
                          'itemListElement': items}, indent=2).replace('\n', '\n      ')
    s = replace_json_object(s, '"@type": "ItemList"', '      ' + payload)
    s = re.sub(r'(<p class="blog-dek">)\w+( pieces on the parts of vedic astrology)',
               r'\g<1>%s\g<2>' % NUMBER_WORD(len(cards)), s)
    s = re.sub(r'(content=")\w+( explainers on nakshatras)', r'\g<1>%s\g<2>' % NUMBER_WORD(len(cards)).capitalize(), s)
    open(path, 'w', encoding='utf-8').write(s)


def NUMBER_WORD(n):
    words = {17: 'seventeen', 18: 'eighteen', 19: 'nineteen', 20: 'twenty',
             21: 'twenty-one', 22: 'twenty-two', 23: 'twenty-three', 24: 'twenty-four'}
    return words.get(n, str(n))


def rebuild_sitemap(cards):
    rows = ['<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']

    def url(loc, freq, pri):
        rows.extend(['  <url>', '    <loc>%s</loc>' % loc, '    <lastmod>%s</lastmod>' % MODIFIED,
                     '    <changefreq>%s</changefreq>' % freq, '    <priority>%s</priority>' % pri, '  </url>'])

    url('https://www.asktota.com/', 'weekly', '1.0')
    url('https://www.asktota.com/blog/', 'weekly', '0.9')
    for c in cards:
        url('https://www.asktota.com/blog/' + c['href'], 'monthly', '0.8')
    for f in ('privacy.html', 'terms.html', 'delete-account.html'):
        url('https://www.asktota.com/' + f, 'yearly', '0.3')
    rows.append('</urlset>')
    open(os.path.join(ROOT, 'sitemap.xml'), 'w').write('\n'.join(rows) + '\n')


def main():
    posts = sorted(p for p in glob.glob(os.path.join(BLOG, '*.html'))
                   if os.path.basename(p) != 'index.html')
    unscheduled = []
    for p in posts:
        name, iso, changed = normalize(p)
        if iso is None:
            unscheduled.append(name)
        print('%-38s %s %s' % (name, iso or 'NO DATE SET', 'updated' if changed else 'already clean'))

    # any link to a post that does not exist yet
    have = {os.path.basename(p) for p in posts} | {'index.html'}
    for p in posts:
        s = open(p, encoding='utf-8').read()
        for href in set(re.findall(r'href="([a-z0-9-]+\.html)"', s)):
            if href not in have:
                print('DANGLING LINK  %s -> %s' % (os.path.basename(p), href))

    if unscheduled:
        print('\nAdd these to SCHEDULE in this file:', ', '.join(unscheduled))
        return 1

    cards = sorted((summarise(p) for p in posts), key=lambda c: c['iso'], reverse=True)
    rebuild_index(cards)
    rebuild_sitemap(cards)
    print('\nblog index and sitemap rebuilt with %d posts' % len(cards))
    return 0


if __name__ == '__main__':
    sys.exit(main())
