#!/usr/bin/env python3
"""Apply exact-match prose replacements to a page, failing loudly on a miss.

Usage: the caller writes a JSON list of {"old":..., "new":..., "count": n}
and passes it with the target file. `count` defaults to 1; FAQ answers appear
twice (visible copy and JSON-LD) so they pass count 2.
"""
import json, pathlib, sys

target = pathlib.Path(sys.argv[1])
edits = json.loads(pathlib.Path(sys.argv[2]).read_text(encoding="utf-8"))
html = target.read_text(encoding="utf-8")

for i, e in enumerate(edits):
    want = e.get("count", 1)
    got = html.count(e["old"])
    if got != want:
        sys.exit(f"edit {i} on {target}: expected {want} match(es), found {got}\n  {e['old'][:120]!r}")
    html = html.replace(e["old"], e["new"])

target.write_text(html, encoding="utf-8")
print(f"{target}: applied {len(edits)} edits")
