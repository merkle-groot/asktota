#!/usr/bin/env python3
"""Print the article body of a blog post, one block per line."""
import re, sys, pathlib
s = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8")
m = re.search(r"<article.*?</article>", s, re.S)
print(m.group(0) if m else "NO ARTICLE")
