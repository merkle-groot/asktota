# STAR FILES no. 001: abhishek sharma

**a trending name, four desks, one downfall desk. 10.9s, loops.**
1080 x 1920, H.264 + AAC, 328 frames.

**Status: held.** Re-cut photo led on 19 September 2026. It currently renders
the redacted plate, because there is no freely licensed photo of him anywhere
(Wikidata `Q19803999` has no `P18`, and the en-wiki article has no lead image).
See "the photo" below. Do not queue it until that is resolved or the redacted
version is a deliberate choice.

## what changed in the re-cut, and why

The first version opened on the masthead sliding down, then the deskbar wiping
in, then a two line hook, and it did not say the subject's name until frame 44.
That is a second and a half of brand furniture spent past the point where a feed
has already decided, and the downfall desk, which is the only line anybody would
stop for, did not arrive until second six.

Four changes, in order of how much they matter:

1. **Frame 0 is the payload.** The plate, the name and the downfall stamp are
   all composed on frame 0. Nothing builds in from nothing. The stamp settles
   from 1.07 scale rather than flying in, so even the first frame is a poster.
2. **The face never leaves.** After the cold open the portrait sits in the case
   header for every remaining frame. There is a person on screen at all times.
3. **The cold open promises the downfall desk and desk 4 pays it off.** An open
   loop rather than a slideshow of four equal cards, and desk 4 holds 52 frames
   against the other three at 36.
4. **The closer asks for an argument first.** `tell us we're wrong` then
   `comment a name`. A request produces comments. A provocation produces threads,
   and a thread keeps a reel circulating.

The masthead is gone. The file tab does the same job in a sixth of the space.

## the photo

The whole re-cut is built around a face on frame 0, and this subject does not
have one that can be used. To fix it:

```bash
# drop a photo you have the rights to at:
#   .blogtools/social/photos/abhishek-sharma.jpg
cd .blogtools/social
python3 genstarfiles.py abhishek-sharma
```

The template picks the file up on its own and the redacted plate disappears. No
JSON edit, no code change. `photos.json` records why this subject is `manual`,
and it is worth re-running `python3 genphotos.py --find "abhishek sharma"` every
few months: a player at this level gets a Commons photo eventually, and flipping
`manual` to `false` then makes it automatic.

## the rules for this series, and they are not optional

1. Character and chart only. Never a claim about a real person's private life,
   health, conduct or relationships. The downfall desk reads a tendency in the
   chart, never an allegation.
2. Public birth date, no birth time. The app's celebrity reading runs
   `timeAccuracy: unknown` with the hour defaulted to noon, so the reel says
   "public date, no birth time" on the cold open, in the case header and in the
   caption. Say it every time.
3. Entertainment. The caption says that too.

The closer farms the next episode: the most requested name becomes no. 002, and
the CTA points at a feature the app actually ships.

No voiceover. Sound design only, so a trending audio can go over the top inside
Instagram. Frame 0 is already the cover frame, which is new: the old reel needed
the cover set manually because the masthead was still snapping in at frame 0.

Re-render: `python3 genstarfiles.py abhishek-sharma` from `.blogtools/social/`.
Edit the data file, never the mp4.

## Caption

See `star-files.json` → `decks.abhishek-sharma.caption`, which is the copy the
scheduler queues. Editing it here does nothing.
