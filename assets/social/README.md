# Ask Tota · social assets

Everything that goes on Instagram. One folder per thing, named so the order and the
date are visible without opening anything.

Open a folder and click an image to preview it. The `.md` files render with
`Cmd+Shift+V`.

| folder | what | count |
|---|---|---|
| `reels/` | one folder per reel, with an mp4 and notes | 4 videos |
| `carousels/` | one folder per deck, slides numbered in swipe order | 94 slides |
| `stories/` | `upcoming/` and `evergreen/`, filenames carry the blog date | 49 cards |
| `statics/` | `myth-desk/` two-ups and `gossip-clippings/` | 20 images |

## carousels

Slides are `01.png` upward, so selecting them all in Instagram keeps the swipe
order. Each folder has `caption.md` with the posting time and the caption to copy.

| # | post on | folder | slides |
|---|---|---|---|
| 01 | 2026-09-16 | `01_2026-09-16_read-ur-kundli` | 8 |
| 02 | 2026-09-23 | `02_2026-09-23_big-three` | 7 |
| 03 | 2026-09-30 | `03_2026-09-30_rahu-ketu` | 8 |
| 04 | 2026-10-07 | `04_2026-10-07_navratri` | 8 |
| 05 | 2026-10-14 | `05_2026-10-14_amanta-purnimanta` | 8 |
| 06 | 2026-10-21 | `06_2026-10-21_mercury-mechanics` | 8 |
| 07 | 2026-10-28 | `07_2026-10-28_mercury-effects` | 8 |
| 08 | 2026-11-04 | `08_2026-11-04_dhanteras` | 8 |
| 09 | 2026-11-11 | `09_2026-11-11_post-shadow` | 8 |
| 10 | — | `10_unscheduled_doshas-ranked` | 8 |
| 11 | — | `11_unscheduled_gunas-36` | 7 |
| 12 | — | `12_unscheduled_neelam` | 8 |

## stories

`upcoming/` is a story whose blog post has not released yet. Post it the morning the
post goes live, 08:30 IST, with the link sticker on the URL in the filename.
`evergreen/` posts are already live, so reshare any time a slot needs filling.

The Instagram API cannot attach link stickers. Add those by hand.

## statics

`myth-desk/` are the Friday two-ups: THE MYTH in pink, THE RECEIPTS in mint.
`gossip-clippings/` are the Saturday newspaper clippings.

## how these get posted

`.blogtools/social/schedule.json` is the queue. It points at every file here by
its public URL, which is what Instagram's API needs. `.blogtools/social/publish.py`
reads it. See `.blogtools/social/SCHEDULING.md` for the three routes.

## how these get made

| asset | generator |
|---|---|
| carousels | `.blogtools/social/gen.py` + `decks.json` |
| myth two-ups and clippings | `.blogtools/social/genstatics.py` + `statics.json` |
| story cards | `.blogtools/social/stories*.html` |
| reels | `.blogtools/social/reel-*.html`, frames screenshotted then ffmpeg |

Never edit the images by hand. Edit the data file and re-render.
