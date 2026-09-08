# scheduling the instagram feed

Short answer to "can Claude Cowork schedule this": **yes, but only as the thing that
runs the job.** Cowork has `/schedule`, which runs tasks in the cloud on a recurring
basis without your laptop being awake, and it supports MCP connectors. What it does not
have is a built-in Instagram integration. So Cowork is the cron, not the publisher.
Something still has to call Instagram, and that is what `publish.py` is.

There are three real routes. Pick one, not three.

## route 1: Meta Business Suite (free, no code, recommended to start)

Business Suite natively schedules feed posts, reels and stories for an Instagram
Business account. No app, no token, no script. It also lets you attach link stickers
to stories, which the API cannot do.

For a two-person team posting six times a week, this is almost certainly the right
answer, and everything in `assets/social/` is ready to upload into it as-is.

Where it stops being enough: it is manual, it will not read a manifest out of this
repo, and you re-upload by hand every week.

## route 2: the API, driven by `publish.py`

Use this when you want the queue to live in the repo next to the assets, so that
"generate a deck" and "schedule a deck" are the same commit.

Why this repo is unusually well set up for it: Meta requires media to be served from
a public HTTPS URL, and **ours already is**. Every carousel slide, story card and reel
sits at `https://www.asktota.com/assets/social/...`. There is no upload step.

### what Meta requires first

1. An Instagram **Business or Creator** account, linked to a Facebook Page.
2. A Meta app with the **`instagram_content_publish`** permission (plus
   `instagram_basic` and `pages_show_list`), taken through App Review.
3. A long-lived access token, and the Instagram Business account id.
4. Respect the limit: **25 published posts per rolling 24 hours.**

### running it

```bash
export IG_USER_ID=...
export IG_ACCESS_TOKEN=...

python3 publish.py            # dry run, changes nothing, prints what is due
python3 publish.py --live     # publishes everything whose time has passed
python3 publish.py --live --id 2026-11-04-dhanteras   # publish one item now
```

`schedule.json` is the queue. Published ids are recorded in `.published.json` so a
re-run never double-posts.

### the constraint nobody mentions

**The Graph API has no future-timestamp field.** You create a media container and then
publish it. Nothing on Meta's side holds a post until Saturday morning. So something of
yours has to be awake at the scheduled minute and call publish. That is the whole reason
route 3 exists.

Also true, and worth knowing before you build around it:
- **Stories cannot carry a link sticker via the API.** Add those by hand, or accept
  that API-published stories are reach only. Every story in `schedule.json` is flagged.
- **Reels need a processing wait.** `publish.py` polls the container until `FINISHED`
  before publishing. That can take a minute or two for a large file.
- **Carousels are 2 to 10 items.** Our decks are 7 or 8 slides, so they fit.

## route 3: something that wakes up on time

Any of these will do. They all just run `publish.py --live`.

| runner | good for | note |
|---|---|---|
| **Claude Cowork `/schedule`** | a daily check with no infrastructure | runs in the cloud, laptop can be closed. give it this folder and the two env vars. |
| **GitHub Actions** on a cron | keeping it next to the repo | schedule it every 15 min; the script no-ops when nothing is due. secrets go in repo settings. |
| **A cheap VPS crontab** | full control | `*/15 * * * * cd /path && python3 publish.py --live` |

A 15 minute cadence is enough. The script only acts on items whose time has passed,
so an item scheduled for 19:30 goes out by 19:45 at the latest.

### wiring it to Cowork

Cowork's `/schedule` runs a task on a recurring basis in the cloud. Point one at this
folder with a prompt along the lines of:

> Every day at 08:00 and 19:30 IST, run `python3 .blogtools/social/publish.py --live`
> in the asktota repo. Report what published. If it errors, do not retry, just tell me.

Two things to get right when you do:
- Cowork needs `IG_USER_ID` and `IG_ACCESS_TOKEN` available to that task. Do not paste
  them into a prompt; set them as environment or connector secrets.
- Keep approval-on-action switched on for the first fortnight, so a bad manifest entry
  cannot quietly post nine times.

## what is in the queue right now

19 items, from 9 September to 11 November 2026, generated from `decks.json`:
one launch reel, nine Chart Desk carousels on the Wednesday 19:30 slot, and nine
matching story cards on the 08:30 slot the same morning. The Wednesday mapping follows
weeks 6 to 14 of `ASK_TOTA_CONTENT_PLAN_V2`, so the Dhanteras deck lands on 4 November,
two days before Dhanteras itself.

Regenerate the queue after adding a deck. Do not hand-edit both files.
