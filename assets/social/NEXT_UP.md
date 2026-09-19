# next up

Concepts that are not built yet, ranked by how much reach they should pull for an
account this size. Each one says which generator makes it, so building it is a data
file and a command, not a new template.

Ranking logic: a reel that produces **comments** beats a reel that produces likes,
and a reel that produces **DM shares** beats both. Saves are for carousels.

---

## shipped 19 September 2026

Three things came off this list and one thing got fixed underneath it.

- **Star Files went photo led.** The subject's face is now on frame 0 and stays
  in the case header for every frame after it. See
  `reels/15_star-file-abhishek-sharma/notes.md` for what was wrong with the
  first cut and why each change was made.
- **Two charts, one reel, built.** `versus` mode, shipped as no. 002,
  kohli vs rohit. This was no. 1 on the list below. See
  `reels/17_star-file-kohli-rohit/notes.md`.
- **The zero lookup comment prompt, built.** `the day of the week u were born`,
  seven varas, seven grahas. Idea 2 below wanted a prompt that manufactures the
  next post; this is the version of it with no lookup cost at all. See
  `reels/18_birth-weekday/notes.md`.
- **Photos have a pipeline.** `genphotos.py` resolves a Wikidata id to a
  Commons photo and records the licence, so a star file subject is one command
  away from a face. Not every public figure has a free photo; the one this
  series opened on does not.
- **Rendering got about eighteen times faster and stopped losing whole runs.**
  `reelshot.py`. Both were costing real time on every single reel.

---

## 1. STAR FILES, every week it trends · `genstarfiles.py`

The series is live at no. 001. Keep it weekly and pick the name off whatever is
actually spiking, not off who is famous in general.

| when to file | who |
|---|---|
| mid series | the cricketer who just did something absurd |
| release week | the lead of the film everyone is arguing about |
| any public feud | both sides, same reel, two slates |
| award night | whoever lost |

The one that outperforms the rest, now built: **two charts, one reel**. `versus`
mode, two faces on frame 0, the desk picks a side each round and scores it. Any
public rivalry works and it does not have to be cricket. It doubles the fandoms
fighting in the comments, which is the point. Check for free photos with
`python3 genphotos.py --find "<name>"` before writing the deck: no photo, no
head to head worth cutting.

Rules do not move: character and chart only, public birth date, no birth time, said
out loud. See `reels/15_star-file-abhishek-sharma/notes.md`.

## 2. "send us their birthday" · new template, one evening of work

A reel that ends on: drop a birthday in the comments and we will read that chart
tomorrow. Then actually do it, as a reply reel. The follow-up reel is the growth
asset, because Instagram treats a reel that answers a comment as its own post and
shows it to everyone who engaged with the first.

This is the highest leverage thing on this list after Star Files, and it is the same
shape: a CTA that manufactures the next post.

## 3. the ick, by placement · `gencallout.py`, new deck

Same engine as `ur moon sign at 2am`, no new code. Twelve cards, each one a specific
ick, then **comment ur venus sign**. Venus rather than sun, because it is a
placement they have to look up, and looking it up is an app open.

Sharper than the red flag reel because an ick is funnier than a flag and people tag
each other under it.

## 4. signs ranked by how fast they text back · `genreel.py`, tier list template

The tier list template already exists and is currently ranking grahas. Swap the chips
for twelve signs and one reason each. Ranking reels get argued with, and an argument
in the comments is the cheapest reach there is.

Put ur own sign in F tier. It reads as a joke and it stops the reel feeling like a
horoscope column.

## 5. guess the chart · new template

Three anonymous charts, three one line reads, then the reveal: all three are people
u know. Built from the app's cached celebrity readings, so the data is already there.

Comment bait plus a rewatch, because nobody gets all three and everybody scrubs back.

## 6. ur ashtakoota score with ur situationship · `gencallout.py` or a new gauge

36 points, eight kootas, and a score at the end. Compatibility is the single most
shared category in this niche and the deck for the mechanics (`gunas-36`) already
exists as a carousel. The reel version should end on a number, because a number is
what gets screenshotted into a group chat.

Do not make it a quiz with an outcome. Make it show how the 36 points are actually
counted, then say "urs is in the app".

## 7. real app screen recordings · no generator, just a phone

The twelve `ask tota` reels are mocks of an answer, and they say so in their notes.
They convert worse than the real thing would.

Record the actual app: type a real question, let the real reading land, film the
scroll. Product footage from a product that genuinely exists outperforms a mock every
time, and it is the only content here that proves the app is real. This is the
biggest gap in the library.

## 8. "astrology accounts keep saying this" · `genmyths.py`

The myth desk series is already running on Fridays, three myths a deck. The spicier
version is pointed: quote the claim the way a big account phrases it, then the
receipts. Never name the account.

Myth busting travels because the people who believe it argue and the people who do
not tag them.

## 9. the 2:14am archive · `gencallout.py`, new deck

`ur moon sign at 2am` will produce comments that are funnier than the reel. Build the
sequel out of the actual comments, credited by first name, one card each.

It costs one data file, it rewards the people who commented, and it teaches the
audience that commenting gets them on the account. Run it a week after the original.

## 10. ur nakshatra as the friend in the group chat · `gencallout.py`

27 nakshatras is too many for one reel, so run it as four reels of seven, or pick the
nine most common. The group chat framing already works and the nakshatra angle is the
thing no western astrology account can copy.

---

## what not to build

**More educational carousels.** There are 43 queued. The library is not short of
teaching, it is short of reach. Every hour spent on a new explainer deck is an hour
not spent on a reel, and the reel is the only thing a stranger will ever see.

**Anything with a paid boost behind it, this month.** Boosting to a 17 follower
account buys views from people with no reason to follow. Wait until one reel has
proved it holds attention on its own, then put money behind that one.

## 8. the reply reel · no generator, one evening

Every prompt this account runs produces buckets of commenters and none of them
have been answered with a post. Pick the day with the most comments under the
vara reel, cut a single card expansion for it, and post it as its own reel.
Instagram treats a reel that answers a comment as a new post and shows it to
everyone who engaged with the first one, so the second reel inherits the first
one's audience for free.

This is the cheapest reach on the whole list and it needs no new template. It
only needs somebody to actually read the comments.

## 9. the downfall desk, on its own · `genstarfiles.py`, deck variant

The downfall desk is the only card anybody stops for and it is currently buried
as the fourth of four. A ten second reel that is nothing but the downfall desk,
on a name that is trending, would test whether the other three desks are
carrying any weight at all. If it performs as well as a full star file, the full
star file is too long.

Worth running as an experiment before building anything else on this list.

## 10. what the desk got wrong · `genstarfiles.py`, versus mode

Take the round the comments argued with hardest on no. 002 and file a reel that
concedes it. The desk changing its mind in public, with the original verdict on
screen next to the revision.

Accounts almost never do this and it is the single most shareable thing a
judgement format can produce, because it turns the people who disagreed into
the people who won.
