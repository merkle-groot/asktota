#!/usr/bin/env python3
"""Publish Ask Tota assets to Instagram via the Content Publishing API.

The assets already live at public HTTPS URLs on asktota.com, which is exactly
what Meta's API requires, so nothing needs uploading anywhere first.

    export IG_USER_ID=...          # the Instagram Business account id
    export IG_ACCESS_TOKEN=...     # a long-lived token with instagram_content_publish

    python3 publish.py                 # dry run: show what is due, change nothing
    python3 publish.py --live          # actually publish everything due now
    python3 publish.py --live --id w9-carousel   # publish one item by id

Requirements Meta imposes, none of which this script can work around:
  - an Instagram Business or Creator account linked to a Facebook Page
  - a Meta app with the instagram_content_publish permission
  - media served over public HTTPS (ours is, on asktota.com)
  - 25 published posts per rolling 24 hours

Note on scheduling: the API has no future-timestamp field. A container is
created and then published, and something has to be awake to fire the publish
at the right minute. That is what --live on a cron or a Cowork scheduled task
is for. See README.md.
"""
import argparse, json, os, pathlib, sys, time, urllib.parse, urllib.request
from datetime import datetime, timezone

API = "https://graph.facebook.com/v21.0"
HERE = pathlib.Path(__file__).resolve().parent
MANIFEST = HERE / "schedule.json"
STATE = HERE / ".published.json"


def _call(method, path, params):
    """One Graph API call. Raises on any error rather than returning a sentinel."""
    url = f"{API}/{path}"
    data = urllib.parse.urlencode(params).encode()
    req = urllib.request.Request(url, data=data, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")
        raise RuntimeError(f"{method} {path} failed with {e.code}: {body}") from None


def _get(path, params):
    url = f"{API}/{path}?{urllib.parse.urlencode(params)}"
    try:
        with urllib.request.urlopen(url, timeout=60) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")
        raise RuntimeError(f"GET {path} failed with {e.code}: {body}") from None


def wait_ready(ig_user, container_id, timeout=300):
    """Video containers are processed asynchronously. Poll until FINISHED."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        st = _get(container_id, {"fields": "status_code,status", "access_token": TOKEN})
        code = st.get("status_code")
        if code == "FINISHED":
            return
        if code == "ERROR":
            raise RuntimeError(f"container {container_id} failed processing: {st.get('status')}")
        time.sleep(5)
    raise RuntimeError(f"container {container_id} still not FINISHED after {timeout}s")


def make_container(ig_user, **params):
    params["access_token"] = TOKEN
    return _call("POST", f"{ig_user}/media", params)["id"]


def publish(ig_user, creation_id):
    return _call("POST", f"{ig_user}/media_publish",
                 {"creation_id": creation_id, "access_token": TOKEN})["id"]


def post_item(ig_user, item):
    """Returns the published media id. One item, one post."""
    kind = item["type"]
    caption = item.get("caption", "")

    if kind == "carousel":
        urls = item["images"]
        if not 2 <= len(urls) <= 10:
            raise ValueError(f"{item['id']}: a carousel needs 2 to 10 images, got {len(urls)}")
        children = [make_container(ig_user, image_url=u, is_carousel_item="true") for u in urls]
        parent = make_container(ig_user, media_type="CAROUSEL",
                                children=",".join(children), caption=caption)
        return publish(ig_user, parent)

    if kind == "image":
        return publish(ig_user, make_container(ig_user, image_url=item["image"], caption=caption))

    if kind == "reel":
        cid = make_container(ig_user, media_type="REELS", video_url=item["video"],
                             caption=caption, share_to_feed="true")
        wait_ready(ig_user, cid)
        return publish(ig_user, cid)

    if kind == "story":
        # stories accept an image or a video; video needs the same processing wait
        if "video" in item:
            cid = make_container(ig_user, media_type="STORIES", video_url=item["video"])
            wait_ready(ig_user, cid)
        else:
            cid = make_container(ig_user, media_type="STORIES", image_url=item["image"])
        return publish(ig_user, cid)

    raise ValueError(f"{item['id']}: unknown type {kind!r}")


def due(items, now, only_id=None):
    published = json.loads(STATE.read_text()) if STATE.exists() else {}
    out = []
    for it in items:
        if only_id and it["id"] != only_id:
            continue
        if it["id"] in published:
            continue
        when = datetime.fromisoformat(it["when"])
        if when.tzinfo is None:
            raise ValueError(f"{it['id']}: 'when' needs a timezone offset, e.g. +05:30")
        if only_id or when <= now:
            out.append(it)
    return out, published


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--live", action="store_true", help="actually publish. without it, dry run.")
    ap.add_argument("--id", help="publish one item by id, ignoring its scheduled time")
    args = ap.parse_args()

    items = json.loads(MANIFEST.read_text())["items"]
    now = datetime.now(timezone.utc)
    todo, published = due(items, now, args.id)

    if not todo:
        print("nothing due.")
        return

    for it in todo:
        label = f"{it['when']}  {it['type']:9s}  {it['id']}"
        if not args.live:
            n = len(it.get("images", [])) or 1
            print(f"[dry run] {label}  ({n} asset{'s' if n > 1 else ''})")
            continue
        print(f"publishing {label} ...", flush=True)
        media_id = post_item(IG_USER, it)
        published[it["id"]] = {"media_id": media_id,
                               "published_at": datetime.now(timezone.utc).isoformat()}
        STATE.write_text(json.dumps(published, indent=1))
        print(f"  -> {media_id}")
        time.sleep(3)   # be polite to the rate limit

    if not args.live:
        print(f"\n{len(todo)} item(s) would publish. re-run with --live to do it.")


if __name__ == "__main__":
    IG_USER = os.environ.get("IG_USER_ID")
    TOKEN = os.environ.get("IG_ACCESS_TOKEN")
    if "--live" in sys.argv and not (IG_USER and TOKEN):
        sys.exit("IG_USER_ID and IG_ACCESS_TOKEN must be set to publish. "
                 "Run without --live for a dry run.")
    main()
