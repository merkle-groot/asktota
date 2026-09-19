# the day of the week u were born

**seven varas, seven grahas, one comment prompt. 11.5s, loops.**
1080 x 1920, H.264 + AAC, 346 frames.

**Scheduled:** Sunday 27 September 2026, 20:00 IST.

## why the weekday and not the moon sign

Every comment prompt this account has run so far costs the viewer a lookup.
"Comment ur moon sign" and "comment ur venus sign" are good prompts precisely
because looking it up is an app open, but they lose everyone who cannot be
bothered, and at this follower count that is most people.

The vara is the one placement with zero lookup cost. Everybody either knows the
day of the week they were born or can find it in four seconds, and the answer is
one word. Lowest friction comment prompt available, and the reply rate is the
whole reason the reel exists.

It is also, and this matters, **real jyotish**. Vara is the weekday lord: sunday
surya, monday chandra, tuesday mangal, wednesday budha, thursday guru, friday
shukra, saturday shani. It is the same graha set the account already teaches and
it is structurally unavailable to a western astrology account.

A birth month version of this was considered and rejected. Month maps to the sun
sign, and in sidereal terms the date ranges are shifted about twenty three days
off the western ones, so a birth month reel is either wrong or needs a caveat
longer than the joke. The vara has no such problem.

## the build

`gencallout.py` with a new deck in `reel-callout.json`. No new code and no new
template: same engine as `ur moon sign at 2am` and `the ick, by venus sign`.

Seven cards rather than twelve, so the hold goes up to 32 frames from the usual
24. Seven jokes with room to land beat twelve that flash past.

Re-render: `python3 gencallout.py birth-weekday` from `.blogtools/social/`.

## the follow-up that makes this worth posting

The prompt produces seven buckets of commenters, which is a reply reel waiting
to happen: pick the day with the most comments and cut a single card expansion
for it. Instagram treats a reel answering a comment as its own post and shows it
to everyone who engaged with the first one.

## Caption

See `reel-callout.json` → `decks.birth-weekday.caption`.
