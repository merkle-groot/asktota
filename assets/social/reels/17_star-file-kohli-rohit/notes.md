# STAR FILES no. 002: kohli vs rohit

**two charts, four rounds, the desk picks a side in each. 11.8s, loops.**
1080 x 1920, H.264 + AAC, 354 frames.

**Scheduled:** Saturday 26 September 2026, 20:00 IST.

## why this format

`NEXT_UP.md` called two charts in one reel the thing that would outperform
everything else on the list, and it is right for one reason: a single subject
reel is read by one fandom, and a head to head is argued over by two. The
comment prompt is not a request, it is a scoreboard somebody disagrees with.

The desk scores it **2 to 1 to rohit**, deliberately. Picking the less expected
side is the entire mechanic. A reel that confirms what the timeline already
believes gets likes. A reel that contradicts it gets replies, and replies are
what keep it circulating.

The downfall desk is round four and has no winner. Both weak spots are the same
sentence read in two directions: the heat that wins is the heat that leaks, the
calm that saves is the calm that stalls. Ending on a tie after three scored
rounds is what makes the scoreline feel judged rather than rigged.

## the build

`versus` mode in `reel-star-file.html`, which shares everything with the solo
star file: same cold open geometry, same case header, same closer.

- Cold open is a split screen, one face each, the right half tinted pink so the
  two sides are told apart at a glance before any name is read.
- Both portraits sit in the case header for every frame after the open.
- Each round is one card, two columns, and the winning column fills marigold.

Photos are Wikidata `P18` via Commons: `Q213854` and `Q3520045`, both **GODL-India**,
Prime Minister's Office. Attribution is recorded per subject in
`photo-credits.json`. Free for commercial use with attribution, which the
licence field names: keep that file with the reel.

Birth dates come off the same Wikidata records as the faces, so the slate and
the portrait cannot drift: kohli 5 Nov 1988, rohit 30 Apr 1987.

## the rules, unchanged from no. 001

Character and chart only, never a claim about a real person's private life,
health or conduct. Public birth dates and no birth times, said on the cold open,
in the case header and in the caption. Entertainment, said out loud.

A head to head raises the stakes on this, not lowers them. "The desk leans here"
is a verdict on two charts. It is never a verdict on two people.

Re-render: `python3 genstarfiles.py kohli-rohit` from `.blogtools/social/`.

## next pairs worth filing

Any public rivalry, and it does not have to be cricket. The format needs two
things only: two names an audience already has an opinion about, and two free
photos. Run `python3 genphotos.py --find "<name>"` before writing the deck,
because no photo means no head to head worth cutting.

## Caption

See `star-files.json` → `decks.kohli-rohit.caption`.
