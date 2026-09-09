#!/usr/bin/env python3
"""Builds the Myth Desk two-ups (archetype D) and the Gossip Desk clippings.

Both are single 1080x1350 feed statics, from BRAND_DESIGN_BIBLE 12.2 and 12.7:
  two-up   left tile THE MYTH in pink, right tile THE RECEIPTS in green, 40px gutter
  clipping newsprint stock, square corners, halftone, a green-ink planet, caption
           in bold lowercase under a hairline rule. never a stock meme template.
"""
import json, pathlib, html as H

ROOT = pathlib.Path(__file__).resolve().parent
INK, GREEN = '#1E3A2A', '#178A4C'

def etch(body, vb='0 0 200 200'):
    """Register B: two-colour etched planet. green ink on newsprint."""
    return (f'<svg viewBox="{vb}" fill="none" stroke="{GREEN}" stroke-width="3.4" '
            f'stroke-linecap="round" stroke-linejoin="round">{body}</svg>')

PLANETS = {
 'mercury': etch('<circle cx="100" cy="100" r="52"/>'
   + ''.join(f'<path d="M{58+i*10} {100-((52**2-(42-i*10)**2)**0.5 if abs(42-i*10)<52 else 0):.0f}'
             f'v{2*((52**2-(42-i*10)**2)**0.5 if abs(42-i*10)<52 else 0):.0f}" opacity=".5"/>' for i in range(9))
   + '<path d="M100 48v-16M92 32h16M100 152v18M90 162h20"/>'),
 'venus':   etch('<circle cx="100" cy="88" r="46"/><path d="M100 134v42M80 156h40"/>'
                 '<path d="M70 70a46 46 0 0 1 60-6" opacity=".55"/>'
                 '<path d="M64 96a46 46 0 0 0 72 14" opacity=".55"/>'),
 'saturn':  etch('<circle cx="100" cy="100" r="42"/>'
                 '<ellipse cx="100" cy="100" rx="78" ry="22" transform="rotate(-18 100 100)"/>'
                 '<path d="M70 88a42 42 0 0 1 58-4" opacity=".5"/>'),
 'moon':    etch('<circle cx="100" cy="100" r="52"/>'
                 '<path d="M100 48a52 52 0 0 0 0 104 40 52 0 0 1 0-104" opacity=".5"/>'
                 '<circle cx="82" cy="84" r="9" opacity=".6"/><circle cx="112" cy="118" r="13" opacity=".6"/>'
                 '<circle cx="120" cy="76" r="6" opacity=".6"/>'),
 # the ascending node glyph, etched
 'rahu':    etch('<path d="M62 148V118a38 38 0 0 1 76 0v30"/>'
                 '<circle cx="62" cy="158" r="11"/><circle cx="138" cy="158" r="11"/>'
                 '<path d="M78 108a38 38 0 0 1 44 0" opacity=".5"/>'
                 '<path d="M100 62v-14M92 48h16" opacity=".7"/>'),
 'mars':    etch('<circle cx="88" cy="112" r="44"/><path d="M120 80 158 42M132 42h26v26"/>'
                 '<path d="M60 100a44 44 0 0 1 54-6" opacity=".5"/>'),
 'jupiter': etch('<circle cx="100" cy="100" r="52"/>'
                 '<path d="M52 84h96M50 100h100M54 118h92M62 134h76" opacity=".55"/>'
                 '<ellipse cx="122" cy="118" rx="16" ry="10" opacity=".8"/>'),
 # the descending node glyph, the same shape inverted
 'ketu':    etch('<path d="M62 60v30a38 38 0 0 0 76 0V60"/>'
                 '<circle cx="62" cy="50" r="11"/><circle cx="138" cy="50" r="11"/>'
                 '<path d="M78 100a38 38 0 0 0 44 0" opacity=".5"/>'
                 '<path d="M100 146v14M92 160h16" opacity=".7"/>'),
}

def hl(s):
    parts, out = s.split('**'), ''
    for i, p in enumerate(parts):
        out += f'<mark>{p}</mark>' if i % 2 else p
    return out

def em(s):
    parts, out = s.split('**'), ''
    for i, p in enumerate(parts):
        out += f'<em>{p}</em>' if i % 2 else p
    return out

def twoup(d, i):
    return (f'<section class="slide" id="myth-{d["id"]}">'
            f'<div class="deskline"><b>the myth desk</b><span>{H.escape(d["date"])}</span></div>'
            f'<h1 class="q">{hl(H.escape(d["q"], quote=False))}</h1>'
            f'<div class="twoup">'
            f'<div class="tile2 myth"><span class="kick">the myth</span>'
            f'<p>{H.escape(d["myth"], quote=False)}</p><span class="arrow">&rarr;</span></div>'
            f'<div class="tile2 receipts"><span class="kick">the receipts</span>'
            f'<p class="small">{H.escape(d["receipts"], quote=False)}</p><span class="arrow">&rarr;</span></div>'
            f'</div><div class="handle">&#129437; @asktotaa</div></section>')

def clipping(d, i):
    return (f'<section class="slide clip" id="clip-{d["id"]}">'
            f'<div class="head"><b>the daily tota</b><span>{H.escape(d["date"])} &middot; the gossip desk</span></div>'
            f'<div class="art">{PLANETS[d["planet"]]}</div>'
            f'<div class="spot">spotted</div>'
            f'<h1>{em(H.escape(d["line"], quote=False))}</h1>'
            f'<div class="hair"></div>'
            f'<p class="cap">{H.escape(d["cap"], quote=False)}</p>'
            f'<div class="foot"><span>cont. p.2</span><span>&#129437; @asktotaa</span></div>'
            f'</section>')

def build():
    data = json.loads((ROOT / 'statics.json').read_text())
    blocks = [twoup(d, i) for i, d in enumerate(data['myths'])]
    blocks += [clipping(d, i) for i, d in enumerate(data['clippings'])]
    page = ("""<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="statics.css"></head><body>\n"""
        + "\n".join(blocks) + """
<script>
document.fonts.ready.then(() => {
  document.querySelectorAll('.tile2 p').forEach(el => {
    let size = parseFloat(getComputedStyle(el).fontSize), guard = 0;
    while (el.scrollHeight > el.clientHeight + 2 && size > 26 && guard++ < 40) {
      size -= 2; el.style.fontSize = size + 'px';
    }
  });
  document.body.dataset.ready = '1';
});
</script>
</body></html>""")
    (ROOT / 'statics.html').write_text(page)
    ids = [f'myth-{d["id"]}' for d in data['myths']] + [f'clip-{d["id"]}' for d in data['clippings']]
    (ROOT / 'statics-index.json').write_text(json.dumps(ids))
    return ids

if __name__ == '__main__':
    ids = build()
    print(len(ids), 'statics:', sum(1 for i in ids if i.startswith('myth')), 'two-ups,',
          sum(1 for i in ids if i.startswith('clip')), 'clippings')
