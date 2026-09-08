#!/usr/bin/env python3
"""Builds Ask Tota carousel slides from decks.json.

Layout is the @yoursocialteam reference the client shared: flat ground, numbered pill
eyebrow, centred display headline with rounded pill highlights, a row of overlapping
preview tiles, a justified body paragraph, handle at the foot.
Type stays Bricolage Grotesque per BRAND_DESIGN_BIBLE 4.1.
"""
import json, pathlib, html as H, sys

ROOT = pathlib.Path(__file__).resolve().parent
INK, MUT = '#1E3A2A', '#5E6E5E'

# --- little diagrams. these are the thing no other astrology account can fake ---
def svg(body, vb='0 0 200 120'):
    return (f'<svg viewBox="{vb}" fill="none" stroke="{INK}" stroke-width="4" '
            f'stroke-linecap="round" stroke-linejoin="round">{body}</svg>')

DIAGRAMS = {
 # north indian kundli: diamond in a square
 'kundli': svg('<rect x="36" y="8" width="128" height="104"/>'
               '<path d="M36 8 164 112M164 8 36 112"/>'
               '<path d="M100 8 164 60 100 112 36 60Z"/>'),
 # the rahu-ketu axis with seven grahas crowded on one side
 'kaalsarp': svg('<circle cx="100" cy="60" r="48"/><path d="M56 38 144 82" stroke-width="5"/>'
                 '<circle cx="82" cy="70" r="6" fill="'+INK+'" stroke="none"/>'
                 '<circle cx="100" cy="80" r="6" fill="'+INK+'" stroke="none"/>'
                 '<circle cx="118" cy="72" r="6" fill="'+INK+'" stroke="none"/>'
                 '<circle cx="92" cy="93" r="6" fill="'+INK+'" stroke="none"/>'
                 '<circle cx="112" cy="92" r="6" fill="'+INK+'" stroke="none"/>'),
 # mercury's retrograde loop against the stars
 'retro': svg('<path d="M18 84C56 84 62 30 92 30s24 60 56 60"/>'
              '<path d="M92 30c-22 0-26 34-4 34s26-34 4-34" stroke-dasharray="7 7"/>'
              '<circle cx="150" cy="86" r="8" fill="'+INK+'" stroke="none"/>'),
 # the 36 point bar, last two blocks carrying 15 of it
 'gunas': svg('<rect x="14" y="46" width="26" height="30" rx="4"/>'
              '<rect x="44" y="46" width="26" height="30" rx="4"/>'
              '<rect x="74" y="46" width="26" height="30" rx="4"/>'
              '<rect x="104" y="34" width="34" height="54" rx="4" fill="#FFD24A"/>'
              '<rect x="142" y="26" width="44" height="70" rx="4" fill="#F8D3E0"/>'),
 # tilted orbit crossing the flat one: where the nodes come from
 'nodes': svg('<ellipse cx="100" cy="60" rx="80" ry="22"/>'
              '<ellipse cx="100" cy="60" rx="80" ry="22" transform="rotate(16 100 60)"/>'
              '<circle cx="24" cy="53" r="7" fill="'+INK+'" stroke="none"/>'
              '<circle cx="176" cy="67" r="7" fill="'+INK+'" stroke="none"/>'),
 # the lagna: horizon line with a sign coming up over it
 'lagna': svg('<path d="M12 84h176"/><circle cx="100" cy="84" r="40"/>'
              '<path d="M100 44v40" stroke-dasharray="6 6"/>'
              '<path d="M148 62l14-10M52 62 38 52"/>'),
 # the nine nights
 'navratri': svg(''.join(f'<circle cx="{22+i*20}" cy="60" r="{7 if i!=4 else 11}" '
                         f'{"fill=\"#FFD24A\"" if i==4 else ""}/>' for i in range(9))),
 # a gemstone
 'stone': svg('<path d="M100 22 152 56 130 100H70L48 56z"/><path d="M48 56h104M100 22 70 100M100 22l30 78"/>'),
 # the moon's phases, for the tithi posts
 'tithi': svg('<circle cx="34" cy="60" r="15"/><circle cx="72" cy="60" r="15"/>'
              '<path d="M72 45a15 15 0 010 30z" fill="'+INK+'" stroke="none"/>'
              '<circle cx="110" cy="60" r="15" fill="'+INK+'" stroke="none"/>'
              '<circle cx="148" cy="60" r="15"/>'
              '<path d="M148 45a15 15 0 000 30z" fill="'+INK+'" stroke="none"/>'),
 # saturn, the slow one
 'saturn': svg('<circle cx="100" cy="60" r="30"/><ellipse cx="100" cy="60" rx="58" ry="16" '
               'transform="rotate(-18 100 60)"/>'),
}

def hl(s):
    """**word** -> marigold pill, ~~word~~ -> pink pill, ++word++ -> white pill."""
    for a, b, cls in (('**','**',''), ('~~','~~',' class="p"'), ('++','++',' class="c"')):
        parts, out = s.split(a), ''
        if len(parts) > 1 and a == b:
            for i, p in enumerate(parts):
                out += f'<mark{cls}>{p}</mark>' if i % 2 else p
            s = out
    return s

def esc(s):
    return H.escape(s, quote=False)

def tile(t):
    cls = f' t-{t["tone"]}' if t.get('tone') else ''
    inner = ''
    if t.get('d'):   inner += DIAGRAMS[t['d']]
    if t.get('img'): inner += f'<img src="{t["img"]}" alt="">'
    if t.get('b'):   inner += f'<b>{hl(esc(t["b"]))}</b>'
    if t.get('s'):   inner += f'<small>{esc(t["s"])}</small>'
    if t.get('cap'): inner += f'<span class="cap">{esc(t["cap"])}</span>'
    return f'<div class="tile{cls}">{inner}</div>'

def foot(i, n):
    dots = ''.join(f'<i class="{"on" if k==i else ""}"></i>' for k in range(n))
    return f'<div class="foot"><div class="handle">@asktotaa</div><div class="dots">{dots}</div></div>'

WORDS = ['one','two','three','four','five','six','seven','eight','nine','ten']

def slide_html(s, i, deck, n):
    g = s.get('g', deck.get('ground', 'mint'))
    parts = [f'<section class="slide g-{g}" id="{deck["id"]}-{i+1:02d}">']
    if s.get('eyebrow') is not None:
        parts.append(f'<div class="eyebrow">{esc(s["eyebrow"])}</div>')
    if s.get('h'):
        cls = ' class="sm"' if len(s['h']) > 46 else ''
        parts.append(f'<h1{cls}>{hl(esc(s["h"]))}</h1>')
    if s.get('save'):
        parts.append(f'<div class="saveline">{esc(s["save"])}</div>')
    if s.get('tiles'):
        parts.append('<div class="tiles">' + ''.join(tile(t) for t in s['tiles']) + '</div>')
    if s.get('quote'):
        q = s['quote']
        parts.append(
          '<div class="qwrap"><div class="sheet-back"></div><div class="page">'
          '<div class="ph">The Daily Tota</div>'
          f'<div class="pe">quote edition &middot; no. {i+1:03d}</div><div class="hr"></div>'
          f'<div class="row"><span>{esc(deck["date"])}</span><span>&#10037; &#10037; &#10037;</span>'
          '<span>price: ur attn</span></div><div class="hr thin"></div>'
          f'<blockquote>{hl(esc(q["q"]))}</blockquote>'
          f'<div class="attrib">{esc(q["attrib"])}</div>'
          '<div class="sticker">screenshot this &#128248;</div></div></div>')
    if s.get('cta'):
        c = s['cta']
        parts.append(f'<div class="ctacard"><h2>{hl(esc(c["h"]))}</h2>'
                     f'<p>{esc(c["p"])}</p><div class="pill">{esc(c["btn"])}</div></div>')
    if s.get('copy'):
        parts.append(f'<p class="copy">{hl(esc(s["copy"]))}</p>')
    if s.get('stamp'):
        parts.append('<div class="stamp">' + ''.join(f'<span>{esc(x)}</span>' for x in s['stamp']) + '</div>')
    parts.append(foot(i, n))
    parts.append('</section>')
    return ''.join(parts)

def build(path='decks.json', out='carousels.html'):
    decks = json.loads((ROOT / path).read_text())
    blocks, index = [], {}
    for key, deck in decks.items():
        deck['id'] = key
        n = len(deck['slides']); index[key] = n
        for i, s in enumerate(deck['slides']):
            if s.get('eyebrow') == 'AUTO':
                s['eyebrow'] = WORDS[i-1] if 0 < i <= len(WORDS) else ''
            blocks.append(slide_html(s, i, deck, n))
    page = ("""<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="style.css"></head><body>\n"""
            + "\n".join(blocks) +
            "\n<script>document.fonts.ready.then(()=>{document.body.dataset.ready='1'})</script>\n</body></html>")
    (ROOT / out).write_text(page)
    (ROOT / 'index.json').write_text(json.dumps(index))
    return index

if __name__ == '__main__':
    idx = build(*(sys.argv[1:] or []))
    print(sum(idx.values()), 'slides across', len(idx), 'decks')
    for k, v in idx.items(): print(f'  {k:26s} {v}')
