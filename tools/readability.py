#!/usr/bin/env python3
"""Flesch-Kincaid grade level for the prose of each blog post.

Reads only the article body, and skips tables, code, forms and the byline so
the score reflects what someone actually reads.
"""
import re, sys, html, pathlib

VOWELS = "aeiouy"

def syllables(word):
    w = re.sub(r"[^a-z]", "", word.lower())
    if not w:
        return 0
    n, prev = 0, False
    for ch in w:
        v = ch in VOWELS
        if v and not prev:
            n += 1
        prev = v
    if w.endswith("e") and n > 1 and not w.endswith(("le", "ee")):
        n -= 1
    return max(n, 1)

def prose(path):
    """Running prose only: the <p> and <li> blocks a reader reads top to bottom.

    Tables, forms, the table of contents, the quick-facts definition list and
    the byline are lookup furniture, not prose, so they are dropped. Each block
    is terminated with a full stop, otherwise two adjacent blocks merge into one
    enormous "sentence" and the words-per-sentence average goes nonsense-high.
    """
    s = path.read_text(encoding="utf-8")
    m = re.search(r"<article.*?</article>", s, re.S)
    body = m.group(0) if m else s
    for pat in (r"<script.*?</script>", r"<style.*?</style>", r"<table.*?</table>",
                r"<form.*?</form>", r"<nav.*?</nav>", r"<dl.*?</dl>",
                r'<p class="blog-byline">.*?</p>',
                r'<p class="section-kicker">.*?</p>'):
        body = re.sub(pat, " ", body, flags=re.S)

    blocks = re.findall(r"<(?:p|li)\b[^>]*>(.*?)</(?:p|li)>", body, re.S)
    text = []
    for b in blocks:
        b = html.unescape(re.sub(r"<[^>]+>", " ", b)).strip()
        if b:
            text.append(b if b[-1] in ".!?" else b + ".")
    return " ".join(text)

def grade(text):
    sents = [x for x in re.split(r"[.!?]+", text) if len(x.split()) > 1]
    words = re.findall(r"[A-Za-z'’]+", text)
    if not sents or not words:
        return None
    syl = sum(syllables(w) for w in words)
    wps = len(words) / len(sents)
    spw = syl / len(words)
    return 0.39 * wps + 11.8 * spw - 15.59, wps, len(words)

rows = []
for p in sorted(pathlib.Path("blog").glob("*.html")):
    if p.name == "index.html":
        continue
    g = grade(prose(p))
    if g:
        rows.append((g[0], g[1], g[2], p.name))

rows.sort(reverse=True)
print(f"{'grade':>6} {'w/sent':>7} {'words':>6}  post")
for g, wps, n, name in rows:
    flag = "  <-- " if g > 6.5 else "      "
    print(f"{g:6.1f} {wps:7.1f} {n:6d}{flag}{name}")
avg = sum(r[0] for r in rows) / len(rows)
print(f"\nmean grade {avg:.1f} across {len(rows)} posts (target: 6.0 or below)")
