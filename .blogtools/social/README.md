# social assets

Everything here regenerates the instagram assets. Nothing in this folder is
served by the site; it is the source for `assets/social/`.

## stories

`stories.html` renders one 1080x1920 story per blog post on `story-base.png`,
which is the shipped desk-scene plate with the headline area patched out.

Add a row to the `STORIES` list in the generator, then:

```bash
B="$HOME/.claude/skills/gstack/browse/dist/browse"
$B viewport 1080x1920
$B goto "file://$PWD/stories.html"
$B screenshot --selector "#s-<slug>" "<slug>-instagram-story.png"
```

Quantise to ~200 colours before committing. It takes each file from about
2.4 MB to 0.9 MB with no visible loss on the flat brand palette.

## reel

`reel.html` exposes a single `render(frame)` function. Every element is
positioned as a pure function of the frame number, so frames are
deterministic and can be screenshotted one at a time.

135 frames at 30fps is 4.5 seconds. Timeline, per BRAND_DESIGN_BIBLE 12.4:

| frames | seconds | what happens |
|---|---|---|
| 0-4   | 0.00-0.13 | masthead snaps down from above. no fade. |
| 5-7   | 0.17-0.23 | the 4px settle |
| 10    | 0.33 | headline line 1, hard cut |
| 16    | 0.53 | headline line 2, hard cut |
| 20-25 | 0.67-0.83 | marigold highlight wipes left to right (180ms) |
| 30    | 1.00 | subhead |
| 42    | 1.40 | CTA button |
| 60-63 | 2.00-2.10 | the press: 4px down, shadow collapses, held 4 frames |
| 66-76 | 2.20-2.53 | tota slides up from the bottom |
| 76+   | 2.53+ | tota bobs +/-4px over 1250ms |
| 84    | 2.80 | asktota.com kicker |

Render and encode:

```bash
mkdir -p frames
B="$HOME/.claude/skills/gstack/browse/dist/browse"
$B viewport 1080x1920
$B goto "file://$PWD/reel.html"
# then for each frame: $B js "render(N)" && $B screenshot --selector "#stage" frames/fNNNN.png
ffmpeg -y -framerate 30 -i frames/f%04d.png \
  -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -shortest \
  -c:v libx264 -profile:v high -level 4.0 -pix_fmt yuv420p -crf 18 -r 30 \
  -movflags +faststart -c:a aac -b:a 128k out.mp4
```

The silent AAC track is deliberate. Instagram is happier with it than without.

## reel generators

Each generator is a template plus a data file. The template owns the motion, the
data file owns the words, and `render(frame)` stays a pure function of the frame
so any frame can be shot independently and out of order.

| generator | template | decks |
|---|---|---|
| `genstarfiles.py` | `reel-star-file.html` | `star-files.json` |
| `gencallout.py` | `reel-callout.html` | `reel-callout.json` |
| `genaskreels.py` | `reel-ask-tota.html` | `reel-ask-tota.json` |
| `genreel.py` | any self-contained `reel-*.html` | in the template |
| `genmyths.py` | `myths.html` | `myths.json` |

All of them capture through `reelshot.py`, which does two things the generators
used to each get wrong on their own. It batches frames into one `browse chain`
process instead of spawning the binary twice per frame, which took a twelve
second reel from eighteen minutes to about one. And it verifies every frame as
it lands and reshoots the ones that dropped, instead of counting files at the
end and throwing the whole render away over a single missing png. Dropped
frames are not rare: a photo led reel loses about six of 328 on a typical run.

### the SFX bed, and one bug worth remembering

The sound bed is built by delaying one wav per event and mixing them, so timing
lives next to the animation it belongs to rather than in a separate edit.

The mix used to end `apad,atrim=0:<dur>`. `apad` with no length generates
silence **forever**, and the `atrim` below it only discards frames: it does not
signal end of stream back up the graph. Whether the render finished in a tenth
of a second or span at 100% CPU was a race on how `amix` propagated EOF. On
19 Sept 2026 it span for fifty minutes on a ten second mix, twice, after
completing instantly a dozen times before that.

It is now `apad=whole_dur=<dur>`, which pads to an exact total and then ends the
stream. Every ffmpeg call also carries a `timeout`, so a future hang fails
loudly instead of blocking the run. If you touch this filter, run the build a
dozen times rather than once: a single pass proves nothing against a race.

## subject photos

`genphotos.py` fills `photos/<slug>.jpg` for the STAR FILES reels. It resolves a
Wikidata id to that entity's `P18` photo on Wikimedia Commons, which is the same
path the app takes for celebrity portraits (`app/utils/wikimediaImage.ts`), then
crops it to the 3:4 card slot with a crop anchored above centre so a wide action
shot does not get beheaded.

```bash
python3 genphotos.py --find "shubman gill"   # look up a qid, write nothing
python3 genphotos.py                         # every subject in photos.json
python3 genphotos.py virat-kohli             # just this one
```

Two things this buys. The licence is nameable, because a Commons file carries
one and `photo-credits.json` records it per subject. And the birth date on the
slate comes off the same record as the face, so the two cannot drift apart.

Not every public figure has a free photo. `"manual": true` in `photos.json` says
so, and until a file is dropped in by hand the template renders the redacted
plate instead: initials behind a pink **no photo on file** bar. That is a
supported state and it looks deliberate, but it is not the same reel. A face on
frame 0 is the single thing that stops a scroll, so a subject worth filing is a
subject worth finding a licensed photo for.

The photo treatment lives in the template, not in the file on disk: duotone to
ink and cream with a dot screen over it, so a press photo sits in the brand
palette instead of fighting it. Retune it in `.duo` and re-render, no refetch.
