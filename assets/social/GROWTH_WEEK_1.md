# @asktotaa · week one

Written 18 September 2026, at 17 followers. This is the posting plan for the next
seven days and, more importantly, the reason the last three weeks did not move.

---

## the diagnosis

The content was never the problem. There are 264 carousel slides, 49 story cards,
20 statics and 15 finished reels on disk. The problem is what got queued.

`schedule.json` held **68 future posts. 43 were carousels. Exactly one was a reel.**
Eleven finished reels were sitting in `assets/social/reels/` with nothing scheduled
against them at all.

That distribution is the whole story:

| format | who it reaches |
|---|---|
| carousel | mostly people who already follow. At 17 followers that is 17 people. |
| story | only followers, and only the ones who tap through. |
| reel | the recommendation feed, which is the only surface that shows a stranger an account they have never heard of. |

An account at 17 followers posting five carousels a week is publishing into an empty
room. The fix is not better carousels. It is reels every single day, with carousels
demoted to the job they are actually good at: converting a profile visit into a
follow after a reel sent someone there.

## what changed today

**Seven reels, seven nights, 20:00 IST.** One per day for the full week. Carousels
moved from 19:30 to 13:00 so they stop competing with that evening's reel.

| day | 13:00 | 20:00 |
|---|---|---|
| Fri 18 | myth desk w01 | **STAR FILES no. 001: abhishek sharma** |
| Sat 19 | (11:00 gossip clipping) | **ur moon sign at 2am** |
| Sun 20 | nakshatra, explained | the tier list |
| Mon 21 | | **ur group chat, by graha** |
| Tue 22 | the nine grahas | red flag / green flag |
| Wed 23 | big three | ask tota: the job question |
| Thu 24 | | the excuse desk |

Bold is new, built today. The rest was already finished and unscheduled.

## the four new things

### 1. STAR FILES, the weekly series

A name that is trending this week goes on the slate, and four desks file a verdict:
career, love, money, and the downfall desk. It closes on **comment a name**, and the
most requested name becomes next week's episode.

This is the best growth mechanic available here, for three reasons:

1. It rides a search term that is already spiking. No. 001 is Abhishek Sharma,
   because a 30 ball T20I hundred is a thing people are looking up today.
2. The CTA farms comments, and comment volume is the strongest ranking signal a
   small account can manufacture.
3. **It points at a feature the app actually ships.** Celebrity life readings are
   already built: cached, globally shared, free to view. So "run it urself" is a
   real sentence, not marketing.

The rules are in `reels/15_star-file-abhishek-sharma/notes.md` and they are not
optional. Character and chart only, never a claim about a real person's private
life or conduct. Public birth date and no birth time, disclosed on the slate and in
the caption every time, because the reading genuinely runs at `timeAccuracy:
unknown`. Entertainment, said out loud.

Next names to file when they trend: a cricketer mid series, an actor the week a film
drops, anybody in a public feud. Write the deck into `star-files.json` and run
`python3 genstarfiles.py <slug>`.

### 2. ur moon sign at 2am

Twelve moon signs, twelve texts nobody should have sent, then a dark panel:
**comment ur moon sign**. The jokes exist to earn that last frame. The moon sign is
also the correct hook for this audience, because it is the placement they have heard
of and never checked.

### 3. ur group chat, by graha

Nine grahas as nine people in one chat. This one closes on **send this to ur rahu**,
a share prompt instead of a comment prompt, because a DM share is worth more than a
like and it is the only reel this week built to leave the app.

### 4. two carousels that are worth saving

`nakshatra, explained` and `the nine grahas`. Both are the differentiator: 27
divisions and nine grahas are things a western astrology account structurally cannot
post. Both end on the dasha clock, which is the one idea that makes someone open the
app.

## the part that is not content

Posting seven reels is necessary and it is not sufficient. At this size the manual
work is most of the result:

1. **Reply to every comment in the first hour**, with a question back. Comment
   threads keep a reel circulating, and a reply that ends in a question doubles the
   thread.
2. **Reshare each reel to stories** within ten minutes, with a poll or a question
   sticker on the same prompt.
3. **Answer the star file requests by name.** "filing kohli next" under a comment is
   a follow, almost every time.
4. **Post the reel, then go and comment** on ten larger astrology accounts in the
   same hour, as @asktotaa, saying something actually funny. This is the oldest
   trick on the platform and it still works at this size.
5. **Do not boost anything yet.** Paid reach against a 17 follower account buys
   views that do not convert. Spend the money in week three, on whichever reel has
   already proved it holds people.

## what to expect, honestly

17 to a few hundred in a week is realistic if the cadence holds and the star file
lands. Virality is not schedulable, and anybody who tells you a number is guessing.
What is controllable is that seven reels go out on time, every comment gets a reply,
and the series produces a reason to come back next Friday.

The metric that matters this week is not followers. It is **comments per reel**, and
whether any single reel breaks 5,000 views. The first one that does is the format to
repeat until it stops working.

## how to run it

Everything is in `.blogtools/social/`. Edit the data file and re-render, never touch
an image or an mp4 by hand.

| asset | data file | command |
|---|---|---|
| star files | `star-files.json` | `python3 genstarfiles.py <slug>` |
| callout reels | `reel-callout.json` | `python3 gencallout.py <slug>` |
| one off reels | `reel-<slug>.html` | `python3 genreel.py <slug> <NN>` |
| carousels | `decks.json` | `python3 gen.py && python3 rendercarousels.py <NN> <slug>` |

`schedule.json` is the queue. `python3 publish.py` dry runs it, `--live` posts.
