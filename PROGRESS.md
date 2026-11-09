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

## Phase 1.5 — the Route (branch `phase-1.5-route`) at `/play`
- One stop per screen: route bar of street lamps (tap a lit lamp to walk back, skip ›), book peek showing only today's slot, full book overlay (spread + inside cover anti-goal + notes).
- Gate: book title, cover colour, mode (Visitor / Jam / Studio), jam theme, anti-goal spark.
- Stops: Word Merchant (free first pack, Fresh/Wild), Theme stall (Jam; theme card in every pack), Gear press (lever), Mapmaker (fold-out map, one swap per part), Fortune Teller (Past/Present/Future), Tailor, Trickster, Rulekeeper (hold to crack the seal), Forge (hold to forge, 3 title options), Night Market (swap from discard).
- Side alleys (Studio): Echo Well after the Gear Booth, Mystery Crate (FREE slot) after the Trickster.
- Spark question after every stamp (pools of 8–12 per stop), answers saved as handwritten notes.
- Weather tint from the MOOD card (fog / dusk / neon / rain / snow), keeper arrival lines, Jam per-stop countdown, receipt at the end.
- Lint: React Compiler hint rules (purity, set-state-in-effect, refs) are warnings, not errors (no compiler in use).

## Known issues / next

- Holding still >420 ms before dragging crumples the card (by design, but may need tuning in `feel.ts`).
- "Flip all" stays visible after every card is up.
- Not yet play-tested on a real phone (only emulated).
- Spark pools are 8–12 per stop (plan: 15–30). Seed-type choice at the Gate (word / mechanic / mood) not built.
- Receipt counts cards sorted (kept + trashed), not every card seen.
