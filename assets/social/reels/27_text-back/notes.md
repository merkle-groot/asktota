# signs ranked by how fast they text back

**the tier list template, second subject. `genreel.py`.**

**Scheduled:** Tuesday 13 October 2026, 20:00 IST.

## why a second tier list

Reel 09 ranked the grahas and the template has been idle since. A ranking reel
gets argued with, and an argument in the comments is the cheapest reach there is.
This one swaps six graha chips for all twelve signs plus a closer, which is the
format's real capacity: the board holds three chips per row across five rows.

## the closer is the whole engine

The thirteenth chip is **ur sign** and it goes straight to F, with the reason
"wherever we put it, u were going to argue. so: f." That is the joke and it is
also the prompt. It asks for a reply without asking for a lookup, so it sits at
the free end of the friction ladder and pairs with a lookup reel later in the
week rather than competing with one.

Nobody has to open the app to have an opinion here. That is the point: this reel
is for reach and ranking signal, and the nakshatra reels either side of it are
for app opens.

## the template change worth knowing

Twelve sign names will not fit a 236px pill at 44px. Anything over eight
characters takes a `.long` class and drops to 33px, which is why sagittarius and
capricorn sit correctly instead of running out of the chip. If new chips are
added, check the longest one at 1080 wide before rendering 383 frames.

Timeline: 42 frames of hook, then a chip every 24 frames, then a 50 frame hold on
the finished board. 383 frames, 12.8 seconds.

Re-render: `python3 genreel.py text-back 27`.
