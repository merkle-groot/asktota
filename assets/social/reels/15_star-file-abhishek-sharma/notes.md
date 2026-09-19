# STAR FILES no. 001: abhishek sharma

**a trending name, four desks, one downfall desk. 10.9s, loops.**
1080 x 1920, H.264 + AAC, 328 frames.

**Scheduled:** Friday 25 September 2026, 20:00 IST.

The original 18 Sept slot had already passed by the time this was re-cut, and
no. 002 was queued for the 26th. A star file no. 001 landing after no. 002 is
not an option, so `the ick` moved from the 25th to the 28th and this took its
place. The ick is evergreen; this one is riding a news peg that decays daily,
so the swap only goes one way round.

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

## the photo, and what is not known about it

The frame is the meditation celebration, supplied by hand on 19 Sept and taken
through the normal crop with `genphotos.py --add`.

**Its licence is unverified and `photo-credits.json` says so in those words.**
It is not a Commons file like the ones behind no. 002, and nobody has checked
what it may be used for. That is a live risk on a commercial account and it sits
with whoever publishes it, not with the pipeline. Kohli and Rohit in no. 002 are
GODL-India via Wikidata, free for commercial use with attribution; this is not
that, and the two should not be confused because they look alike on screen.

No freely licensed alternative exists. Wikidata `Q19803999` has no `P18`, a
Commons title and category search returns only the businessman, the film
director and unrelated namesakes, and Openverse returns one 208x276 Commons png
that has since been deleted. `photos.json` records all three checks so nobody
repeats them. Re-run `python3 genphotos.py --find "abhishek sharma"` every few
months: a player at this level gets a Commons photo eventually, and flipping
`manual` to `false` then makes it automatic and properly licensed.

Two framing settings, both in data rather than hand cropping, so a re-run
reproduces them:

- `photos.json` → `crop: {"x": 0.29}`. He sits left of centre in the supplied
  frame, and a centred crop puts his face a third of the way in and clips a hand.
- `star-files.json` → `headZoom: 1.55`. The stored photo is framed for the cold
  open, which wants the pose. At 200px in the case header that same framing
  renders his face about thirty pixels across, which is nothing on a phone, so
  the header pushes in on the face. A photo already cropped to head and
  shoulders leaves this at 1 and is untouched.

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
