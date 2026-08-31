#!/usr/bin/env python3
"""Wrap each rashi word in <b> so mobile can drop the word and keep the glyph."""
import re, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
# <svg class="rashi-glyph"><use href="#rashi-x"/></svg>mesha</span>
PATTERN = re.compile(r'(<svg class="rashi-glyph"><use href="#rashi-[a-z]+"/></svg>)([a-z]+)(</span>)')

total = 0
touched = 0
for path in sorted(ROOT.glob("*.html")) + sorted((ROOT / "blog").glob("*.html")):
    html = path.read_text(encoding="utf-8")
    if 'class="rashi-glyph"' not in html:
        continue
    new, n = PATTERN.subn(r'\1<b>\2</b>\3', html)
    if n and n != 24:
        sys.exit(f"{path}: expected 24 rashi labels, wrapped {n}")
    if new != html:
        path.write_text(new, encoding="utf-8")
        touched += 1
        total += n

print(f"wrapped {total} labels across {touched} pages")
