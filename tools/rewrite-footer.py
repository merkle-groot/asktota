#!/usr/bin/env python3
"""Rewrite the footer nav on every page to the agreed four links + Instagram."""
import re, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
PLAY = "https://play.google.com/store/apps/details?id=app.asktota"
IG = "https://www.instagram.com/asktotaa/"

IG_SVG = (
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">'
    '<rect x="3" y="3" width="18" height="18" rx="5"/>'
    '<circle cx="12" cy="12" r="4"/>'
    '<circle cx="17.2" cy="6.8" r="1.15" fill="currentColor" stroke="none"/>'
    '</svg>'
)

def block(prefix: str) -> str:
    return (
        '<nav class="foot-links" aria-label="Footer">\n'
        f'          <a href="{PLAY}" target="_blank" rel="noopener">download the app</a>\n'
        f'          <a href="{prefix}blog/">blog</a>\n'
        f'          <a href="{prefix}privacy.html">privacy policy</a>\n'
        f'          <a href="{prefix}terms.html">terms and conditions</a>\n'
        '          <a href="mailto:hi@asktota.com">contact</a>\n'
        f'          <a class="foot-social" href="{IG}" target="_blank" rel="noopener" aria-label="Ask Tota on Instagram">{IG_SVG}<span>instagram</span></a>\n'
        '        </nav>'
    )

PATTERN = re.compile(r'<nav class="foot-links"[^>]*>.*?</nav>', re.S)

changed = []
for path in sorted(ROOT.glob("*.html")) + sorted((ROOT / "blog").glob("*.html")):
    html = path.read_text(encoding="utf-8")
    if 'class="foot-links"' not in html:
        continue
    prefix = "../" if path.parent.name == "blog" else ""
    new, n = PATTERN.subn(lambda _m: block(prefix), html)
    if n != 1:
        sys.exit(f"{path}: expected 1 foot-links nav, found {n}")
    if new != html:
        path.write_text(new, encoding="utf-8")
        changed.append(path.relative_to(ROOT))

print(f"rewrote {len(changed)} footers")
for c in changed:
    print(" ", c)
