# Progress

## Phase 0 — vocab (branch `phase-0-vocab`)
Starter banks (~200 entries) in `data/vocab`, `npm run vocab:lint`, `npm run vocab:sample [seed]`.

## Phase 1 — feel prototype (branch `phase-1-feel`) at `/prototype`
- Buy (coin flip) → drag-to-tear pack → fan → flip (rare/mythic pause half-turned) / Flip all.
- Trash: hold to crumple (+ release/flick to bin), fast downward swipe = rip, fast fling. Drag onto the bin works too.
- Stamp: drag onto matching slot → snap, thud, tape, KEPT ink stamp, 4px shake. Tap a card for Stamp/Crumple/Rip/Flick buttons (keyboard + touch).
- 4-slot mini page (SEED · CORE VERB · LOOK · TWIST), peel, FORGE → polaroid concept with editable title.
- Mini-games: Tailor reels (stop, lock, 2 respins, palette swatch) and Trickster shell game (shuffle, pick, "…or this").
- Studio duck sprite + quack from the quackle.bit website (`public/duck`), reacting with its Aseprite tags.
- Pixel skin: Silkscreen + Pixelify Sans, notched pixel borders, hard shadows, dithered fills.
- Mobile-first: book pinned at the bottom on phones, touch drag, haptics. Mute, speed mode, reduced motion.
- All timings in `src/feel.ts`. No new dependencies (pointer events + Web Animations + WebAudio).

## Known issues / next
- Holding still >420 ms before dragging crumples the card (by design, but may need tuning in `feel.ts`).
- "Flip all" stays visible after every card is up.
- Not yet play-tested on a real phone (only emulated).
- Next: Phase 1.5 — the Route (one stop per screen, lamps, book peek, spark questions).
