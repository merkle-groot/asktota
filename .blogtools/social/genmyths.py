#!/usr/bin/env python3
"""Builds the weekly myth desk carousels from myths.json.

Three myths busted per deck, one deck every friday, 34 weeks. Each deck is five
1080x1350 slides:

  01  the cover: the week's hook and the three claims, listed as a docket
  02  myth one, the archetype D two-up from BRAND_DESIGN_BIBLE 12.2
  03  myth two
  04  myth three
  05  the closer: the week's rule, and the CTA

The two-up in the middle is the same markup and the same statics.css the single
Friday myth statics already used, which is why the slides look identical to the
myth desk images that exist. Nothing about that design is re-invented here; this
file only adds the cover and the closer around it.

    python3 genmyths.py            # writes myths.html and myths-index.json
"""
import json, pathlib, html as H, datetime as dt, sys

ROOT = pathlib.Path(__file__).resolve().parent
SITE = ROOT.parent.parent
BASE = 'https://www.asktota.com/assets/social/carousels'
MONTHS = ['jan','feb','mar','apr','may','june','july','aug','sept','oct','nov','dec']
DAYS   = ['mon','tue','wed','thu','fri','sat','sun']
WORDS  = ['one', 'two', 'three']


def esc(s):
    return H.escape(s, quote=False)


def hl(s):
    """**word** -> marigold pill. Same convention as genstatics.py and gen.py."""
    parts, out = s.split('**'), ''
    for i, p in enumerate(parts):
        out += f'<mark>{p}</mark>' if i % 2 else p
    return out


def plain(s):
    return s.replace('**', '')


def week_date(start, n):
    return start + dt.timedelta(weeks=n - 1)


def pretty(d):
    return f'{DAYS[d.weekday()]}, {d.day} {MONTHS[d.month - 1]}'


def dots(i, n=5):
    return '<div class="dots">' + ''.join(
        f'<i class="{"on" if k == i else ""}"></i>' for k in range(n)) + '</div>'


def deckfoot(i):
    return f'<div class="deckfoot"><span>&#129436; @asktotaa</span>{dots(i)}</div>'


def deskline(right):
    return (f'<div class="deskline"><b>the myth desk</b>'
            f'<span>{esc(right)}</span></div>')


def cover(w, d):
    cases = ''.join(
        f'<div class="case"><b>{i + 1:02d}</b><p>{esc(plain(m["q"]))}</p></div>'
        for i, m in enumerate(w['myths']))
    return (f'<section class="slide cover" id="myth-{w["slug"]}-01">'
            + deskline(f'vol. {w["n"]:02d} \u00b7 {pretty(d)}')
            + f'<h1 class="hook">{hl(esc(w["hook"]))}</h1>'
            + f'<div class="docket">{cases}</div>'
            + '<div class="saveline">three myths, three sets of receipts. swipe &rarr;</div>'
            + deckfoot(0) + '</section>')


def twoup(w, m, i):
    """Byte for byte the archetype D two-up, with the deck foot swapped in for
    the single-static handle so the slide carries its swipe position."""
    return (f'<section class="slide" id="myth-{w["slug"]}-{i + 2:02d}">'
            + deskline(f'myth {WORDS[i]} of three')
            + f'<h1 class="q">{hl(esc(m["q"]))}</h1>'
            + '<div class="twoup">'
            + '<div class="tile2 myth"><span class="kick">the myth</span>'
            + f'<p>{esc(m["myth"])}</p><span class="arrow">&rarr;</span></div>'
            + '<div class="tile2 receipts"><span class="kick">the receipts</span>'
            + f'<p class="small">{esc(m["receipts"])}</p><span class="arrow">&rarr;</span></div>'
            + '</div>' + deckfoot(i + 1) + '</section>')


def closer(w):
    return (f'<section class="slide closer" id="myth-{w["slug"]}-05">'
            + deskline('the rule')
            + '<div class="ruleblock">'
            + '<span class="kicker">what to keep</span>'
            + f'<p class="rule">{hl(esc(w["rule"]))}</p>'
            + '<div class="cta"><b>every claim we make carries a number u can check.</b>'
            + '<span>ur chart, ur dasha, ur transits, computed from ur birth minute. '
            + 'swiss ephemeris, lahiri ayanamsa, whole sign houses.</span>'
            + '<div class="pill">free on asktota.com</div></div>'
            + '</div>' + deckfoot(4) + '</section>')


def caption(w, d):
    claims = '\n'.join(f'{i + 1}. {plain(m["q"])}' for i, m in enumerate(w['myths']))
    return (f'# myth desk vol. {w["n"]:02d} \u00b7 {w["title"]}\n\n'
            f'**post on {d.isoformat()} at 19:30 IST.** 5 slides, in order.\n\n'
            f'## the three\n\n{claims}\n\n## caption\n\n'
            f'three myths this week, and the receipts for each one.\n\n'
            f'{plain(w["rule"])}\n\n'
            f'save it. u will hear at least one of these at a family function, '
            f'and now u have the numbers.\n\n'
            f'which one did u grow up believing? tell us, we will do that one next.\n\n'
            f'free chart on asktota.com \U0001F99C\n\n'
            f'#vedicastrology #jyotish #kundli #astrologyindia #asktota #mythbusting '
            f'#astrologyfacts #birthchart #desiastrology #astrologyapp\n')


def build():
    data = json.loads((ROOT / 'myths.json').read_text())
    start = dt.date.fromisoformat(data['start'])
    assert start.weekday() == 4, 'the myth desk posts on fridays'

    blocks, index = [], []
    for w in data['weeks']:
        d = week_date(start, w['n'])
        assert len(w['myths']) == 3, f'week {w["n"]} does not have three myths'
        blocks.append(cover(w, d))
        blocks += [twoup(w, m, i) for i, m in enumerate(w['myths'])]
        blocks.append(closer(w))
        index.append({
            'n': w['n'],
            'date': d.isoformat(),
            'slug': w['slug'],
            'title': w['title'],
            'folder': f'myth-desk/w{w["n"]:02d}_{d.isoformat()}_{w["slug"]}',
            'ids': [f'myth-{w["slug"]}-{k:02d}' for k in range(1, 6)],
            'caption': caption(w, d),
        })

    page = ("""<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="statics.css">
<link rel="stylesheet" href="myths.css"></head><body>\n"""
            + "\n".join(blocks) + """
<script>
// Same guard genstatics.py uses: the receipts run long on some myths, so step the
// body down until it fits rather than letting a tile overflow silently.
document.fonts.ready.then(() => {
  document.querySelectorAll('.tile2 p').forEach(el => {
    let size = parseFloat(getComputedStyle(el).fontSize), guard = 0;
    while (el.scrollHeight > el.clientHeight + 2 && size > 24 && guard++ < 40) {
      size -= 2; el.style.fontSize = size + 'px';
    }
  });
  document.querySelectorAll('.slide.cover h1.hook').forEach(el => {
    let size = parseFloat(getComputedStyle(el).fontSize), guard = 0;
    while (el.scrollHeight > 320 && size > 62 && guard++ < 40) {
      size -= 2; el.style.fontSize = size + 'px';
    }
  });
  // the rules vary a lot in length. step the long ones down so the CTA card below
  // never gets squeezed off the slide.
  document.querySelectorAll('.slide.closer p.rule').forEach(el => {
    let size = parseFloat(getComputedStyle(el).fontSize), guard = 0;
    while (el.scrollHeight > 400 && size > 40 && guard++ < 40) {
      size -= 2; el.style.fontSize = size + 'px';
    }
  });
  document.body.dataset.ready = '1';
});
</script>
</body></html>""")
    (ROOT / 'myths.html').write_text(page)
    (ROOT / 'myths-index.json').write_text(json.dumps(index, indent=1, ensure_ascii=False))
    return index


def schedule(idx):
    """Rewrites the myth desk half of schedule.json.

    The nine single Friday myth statics are superseded by the decks that carry the
    same myths, so they come out. Every URL is checked against the filesystem before
    the file is written, same rule as the rest of this folder.
    """
    path = ROOT / 'schedule.json'
    sched = json.loads(path.read_text())
    dropped = [i for i in sched['items']
               if '-myth-w' in i['id'] or i['id'].startswith('myth-desk-w')]
    keep = [i for i in sched['items'] if i not in dropped]

    added = []
    for w in idx:
        images, missing = [], []
        for k in range(1, 6):
            rel = f'{w["folder"]}/{k:02d}.png'
            if not (SITE / 'assets' / 'social' / 'carousels' / rel).exists():
                missing.append(rel)
            images.append(f'{BASE}/{rel}')
        if missing:
            sys.exit(f'missing slide files, refusing to write schedule.json: {missing}')
        body = w['caption'].split('## caption\n\n', 1)[1].strip()
        added.append({
            'id': f'myth-desk-w{w["n"]:02d}-{w["slug"]}',
            'when': f'{w["date"]}T19:30:00+05:30',
            'type': 'carousel',
            'images': images,
            'caption': body,
        })

    sched['items'] = sorted(keep + added, key=lambda i: i['when'])
    path.write_text(json.dumps(sched, indent=1, ensure_ascii=False) + '\n')
    return len(dropped), len(added)


if __name__ == '__main__':
    idx = build()
    print(f'{len(idx)} decks, {len(idx) * 5} slides, {len(idx) * 3} myths')
    print(f'  first  {idx[0]["date"]}  {idx[0]["folder"]}')
    print(f'  last   {idx[-1]["date"]}  {idx[-1]["folder"]}')
    if '--schedule' in sys.argv:
        out, ins = schedule(idx)
        print(f'schedule.json: dropped {out} single myth statics, added {ins} decks')
