# Phase 9 plan: bring the feel back (no pixel UI)

## What's wrong with Phase 8 (checked in the build)

| Area | Phase 1–7 (street) | Phase 8 (desk) now | Verdict |
| --- | --- | --- | --- |
| Pack opening | `PackStation`: drag-tear with rising rip pitch, top flies off, riffle fan, flip with overshoot, rare cards pause half-turned | `BoosterPack`: a rewrite. Tear exists but the cards appear in a flat grid with buttons | Weaker: the ceremony was dropped |
| Reacting to a card | `HandCard`: drag to a slot (spring + snap + 4 px shake + THUD + ink stamp ±3°), trash by crumple / rip / fling into a bin, duck yells | Buttons: "Keep", "Set aside", ☆ | The core "angry / good moment" is gone |
| Page turn | (`BookViewer`, removed) | `usePageTurn`: one leaf rotates 86° away and back, like a card flip | Doesn't read as paper: no spread, no curl, no page underneath |
| Progress reward | Lamps lighting with a *tink*, fanfare, forge | "7 / 12 pages explored" text | No reward |
| Look | Pixel UI | Warm paper UI | Right direction, keep it |

So the redesign got the *structure* right (desk, pages, pitch, wall) but replaced the game with forms.
Phase 9 keeps the structure and the non-pixel look, and puts the old gestures back in.

## Rules
- **No pixel art in the UI.** Fraunces/Nunito, paper, tape, ink stamps. Pixel stays only for things *about the
  game idea* (none needed now). Old `.pxb` / `--font-pixel` styles are not reused; only the *behaviour* is.
- **Reuse, don't rewrite:** the gesture logic in `HandCard.tsx`, `PackStation.tsx`, `lib/physics.ts`,
  `lib/motion.ts`, `lib/sound.ts`, `feel.ts` is good and tested. Restyle it with `.dk` classes.
- Every gesture keeps a button alternative (accessibility, desktop), and speed mode / reduced motion still work.

## Steps (one commit each)

### 9.1 Shared feel layer
- Move gesture code out of the street: `HandCard` → `src/components/feel/DragCard.tsx` with props
  `{ onStamp(slotEl), onTrash(how), targets }`, no pixel classes. `PackStation`'s tear/fan/flip →
  `src/components/feel/PackOpen.tsx`. Street components import the new ones so Studio/Jam keep working.
- New paper skin for cards (reuse `PaperCard` look) on top of the old motion.
- *Done when:* the street still works and the new components render in the desk style.

### 9.2 Pack → card → page (the main loop)
- Replace `BoosterPack` with `PackOpen` + `DragCard`:
  envelope tear (rip sound rising) → cards riffle out face-down in a fan → flip (rares pause half-turned,
  uncommon/rare get a soft foil sheen in paper colours).
- **Keep = drag the card onto the page** (a taped slot area on the current page). Snap, thud, 4 px shake,
  washi tape slaps over the corner, ink date stamp, ±3° tilt. Tap + "Stick it in" button as the alternative.
- **Not for me = crumple, rip or fling** to a paper bin in the corner; the duck reacts (text bubble, existing
  `Duck.tsx` lines, restyled). Set-aside cards go to the bin, recoverable (it "un-crumples").
- Favorite = a gold star sticker stuck on the card (not a toggle icon).

### 9.3 A real book
- Two-page spread on wide screens, one page on phones, drawn as a book on the desk (spine, page stack edges).
- Page turn: drag from the page corner; the page curls with a CSS 3D transform + gradient shadow following the
  finger, the next page is visible underneath; release past half = turn, else falls back. Paper-flip sound.
  Arrows/buttons trigger the same animation. (Custom CSS, no StPageFlip, so pages stay React.)
- Stuck cards live on the page itself (taped, slightly rotated), not in an "On this page" list.

### 9.4 Rewards
- Each page gets a stamp on the page-index when explored (rubber-stamp *thunk*), replacing the counter text.
- Finishing a section (Identity, Playground, Atmosphere, Production) = a sticker on the cover with a small fanfare.
- "Close the scrapbook" plays the forge: stuck cards lift off, gather, flash, and land as the polaroid pitch card.
- Receipt-style summary on the close page (packs opened, cards kept, cards trashed), reusing `Receipt.tsx` logic.

### 9.5 Bring back the best mini-games (optional pages)
- Pack styles per page instead of one envelope everywhere, reusing street mini-games restyled:
  Genre = Gear press, Setting = Folded map, Mood = Tarot spread, Visual = Tailor reels, Hook = Shell game,
  Restrictions = Sealed scrolls. Each still ends in the same drag-to-page gesture.

### 9.6 Test pass
- Phone (real device over LAN) + desktop: each gesture, speed mode, reduced motion, mute, keyboard-only.
- Compare side by side with the Phase 7 street on the same flow (open 3 packs, keep 5, trash 5): it should feel
  at least as good.

## Open questions for you
1. Two-page spread on desktop, or always a single page?
2. Should mini-games (9.5) replace the envelope on those pages, or be an extra "fancy pack" option?
3. Keep the duck as the reacting character in the new look (text bubble, no pixel sprite), or drop it?
