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
