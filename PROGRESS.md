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

## Phase 2 — Visitor version (branch `phase-2-visitor`)

- Home page (`/`): duck, "Walk the street", "Open my book", footer explaining the toy + link to quacklebit.com.
- `/play`: Visitor street by default; `?mode=jam` / `?mode=studio` are local previews until accounts exist.
- Daily purse: 10 coins, resets at local midnight (`src/lib/store.ts`). First word pack is free.
- Visitor card pool: no Mythic / studio-only cards (`setPoolRules`).
- Local book (`/book`): cover (title, colour, stickers, today's coins), inside cover (anti-goal + stats), one page per spread (share, tear out), discard pile, collection index with rarity counts. Turn pages by swipe, ← →, buttons or dots, with a page-swing animation.
- Up to 5 spreads; stickers: first idea, shiny!, MYTHIC, 10 QUACKS, QUACK MASTER, full book, collector.
- Share links (`/s#…`): the spread is encoded in the URL hash (never sent to a server); decoded input is validated (slot names, colours) before rendering.
- Unsorted cards are swept into the discard pile when you leave a stop (recoverable at the Night Market).
- Animations finish on a timer if the tab is hidden, so sequences never hang.

## Phase 3 — Studio (branch `phase-3-studio`) at `/studio`

- Library: shelf of books, spreads with status (Idea → Prototype → Production), votes, comments, version history with restore, delete.
- The Ledger (`src/lib/ledger.ts`): sprites × directions × frames, tiles, props, UI, FX → hours + tier, risks and a milestone sketch; plus a jam cut list.
- The Appraiser: `POST /api/appraise` → Claude Opus 5.5 (structured output via zod: pitch, 3 alternative twists, risks, suggestion), server-side refusal fallback on. Members only; per-member daily cap in Postgres + in-memory burst limit; refuses in production when auth isn't configured.
- Back Room: mint custom cards (incl. Mythic); Studio street has a Back Room detour after the Word Merchant selling minted + rare/Mythic cards into the FREE slot.
- Export: Markdown, JSON and PNG (html-to-image) per spread.
- Auth: Supabase magic link + email allowlist (`/auth/callback`), members table filled by trigger.
- Database: `supabase/migrations/0001_init.sql` covers Studio and Jam rooms with RLS and definer functions; `npm run db:test` checks 24 rules in PGlite.
- Without Supabase keys everything runs as a local preview (`LocalStudioRepo`); with keys the same UI uses `SupabaseStudioRepo`.
- New deps: @anthropic-ai/sdk, zod, @supabase/supabase-js, @supabase/ssr, server-only, html-to-image; dev: @electric-sql/pglite.

## Known issues / next

- Not verified against a live Supabase project or with a real Anthropic key (no keys here): the SQL is tested in PGlite, the TypeScript type-checks, the UI runs on the local backend.

- Holding still >420 ms before dragging crumples the card (by design, but may need tuning in `feel.ts`).
- "Flip all" stays visible after every card is up.
- Not yet play-tested on a real phone (only emulated).
- Spark pools are 8–12 per stop (plan: 15–30). Seed-type choice at the Gate (word / mechanic / mood) not built.
