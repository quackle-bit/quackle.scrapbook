# Phase 10 plan: pixel scrapbook, one screen per page, shorter pitch

From phone testing (2026-11-10). This replaces the "no pixel UI" rule from Phase 9: the UI is now
**pixel style on clean white paper**. The page structure, pitch, concepts and wall stay.

## Look
- **White paper, pixel details.** Off-white pages, pixel font for titles and card words (the existing
  `--font-pixel`), readable body font for small text, 2 px stepped "pixel" borders and shadows, no gradients
  or blur. Scrapbook touches drawn as pixel shapes: washi tape, stamps, paper clips, polaroid frame.
- **Desk home and radio** redrawn in the same pixel style (radio = pixel boom box / pocket radio, same stations).
- **Duck sharp:** draw it at whole-number scales only with `image-rendering: pixelated` (today it's scaled
  by fractional amounts and smoothed, which is why it's blurry).

## One screen per page (no scrolling)
- Every page fits a phone screen (~375×700 usable). If a page has more, it splits into **steps inside the
  page** (dots + "Next"), never a scroll.
- Fixed layout: top bar (book name, stamps) · page area · **big bottom bar: ‹ Back | page name | Next ›**.
  Next/Back are the main way to move, always the same place, large and easy to hit.

## Page turning
- Buttons (and arrow keys) play a short **pixel page flip** (stepped frames, ~300 ms).
- **No swipe-anywhere and no corner drag** on pages with packs, so turning can't fight with opening packs.
  (A swipe can come back later, limited to the outer page edge.)

## Packs, redesigned for phones
- **4 cards per pack, laid out 2×2 inside the page frame.** Tap a card to flip it, tap again to choose it
  (a pixel ✓ tape appears). Then **Keep chosen** (the chosen ones get stamped into the book; the rest crumple into
  the bin, which you can still open). **Open another** gives 4 new ones.
- Nothing extends past the page border; no fan, no drag needed (drag stays as an extra on desktop).
- Stall keepers stay (one line under the sign). The mini-games (press, map, tarot, reels, cups) become the
  *opening* animation of the 2×2 pack where they fit the screen, otherwise a simple pixel envelope.

## Title as a gacha
- A **pixel gacha machine**: turn the knob → a capsule drops → it opens to **3 title suggestions** built from
  what you already kept (mechanics, twist, mood, setting) plus the word bank.
- Tap a suggestion to use it, or **spin again**. You can still type your own. Suggestions only; nothing is filled in by itself.

## Shorter early pitch: order and what's hidden
New order (9 pages, each one screen):

| # | Page | Keeps | Hidden for now |
|---|---|---|---|
| 1 | Jam setup | theme, time, team size, platform | restrictions (moved to "more" toggle) |
| 2 | Core mechanics | up to 3 mechanics (pack) | favorites |
| 3 | Core loop | 3–5 steps (tap to add) | loop variations |
| 4 | Twist / hook | 1 twist (cups) + one line | twist combiner |
| 5 | Mood & world | mood, setting, look (one tab per step) | audio, notes, "primary" picking |
| 6 | Scope | Must have / Cut first lists | 10-point allocator, nice-to-have |
| 7 | Genre | one genre (pack) | secondary genre |
| 8 | Title & tagline | title (gacha), tagline optional | — |
| 9 | Pitch | close the book → forge → pitch spread | — |

- **Hidden, not deleted:** High concept, Objective, Audio, secondary genre, loop variations, scope points.
  Their data and code stay; a setting ("Show extra pages") can bring them back.
- Title, tagline and genre move to the end: you name the game after you know what it is.
- **The tagline isn't on the front.** The cover / first screen and pitch cards show the title only; the tagline
  appears inside the pitch. *(Assumption: tell me if "front" meant somewhere else.)*

## Steps (one commit each)
1. **10.1 Pixel white design system** + sharp duck + new bottom bar + button page flip (no swipe/corner).
2. **10.2 Page order and hiding** (new 9-page flow, "Show extra pages" setting), one-screen layout per page.
3. **10.3 2×2 pack** (4 cards, choose, keep chosen, bin) with pixel cards; mini-games as openers where they fit.
4. **10.4 Title gacha** + tagline at the end.
5. **10.5 Desk home + radio** redrawn pixel; pitch spread, wall and rewards restyled to match.
6. **10.6 Phone pass:** check every page at 375×667 and 390×844 with no scrolling, then your phone test.
