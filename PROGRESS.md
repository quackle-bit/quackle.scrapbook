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

## Phase 4 — Jam rooms (branch `phase-4-jam`) at `/jam`

- Lobby: join with a room code + nickname (guests sign in anonymously on Supabase); studio members open a Jam Bazaar (theme, minutes, guest cap, starting coins).
- Room (`/jam/room?code=…`): live countdown, guest count, Walk / Album / Trading post tabs.
- Walk: the jam street with the theme locked on the Gate and a theme card in every pack; coins are the room's (spent through `spend_room_coin`).
- Trading post: trashed and leftover cards go up on the post; pick someone's card, offer one of yours; the other guest accepts or declines live; received cards can be taped into the matching empty slot.
- Jam Album: one page per guest (revisable while open), ❤ 🔥 🤔 reactions, a 48h cut list per page; after close the top 3 pages get "Join this idea" (team forming). Hosts can hide pages, close the market and adopt a page into a studio book credited to the guest.
- Server rules (in `0001_init.sql`, tested by `npm run db:test`, 32 checks): guest cap, unique nicknames, coins, room open/closed, one page per guest, no Mythic/studio-only cards for guests, atomic trades, team joins only after close, adopt credits the guest.
- Two backends: `LocalJam` (each browser tab is a guest; live through storage events) and `SupabaseJam` (RPCs + Realtime).

## Phase 5 — Portfolio polish (branch `phase-5-polish`)

- quackle.bit branding: pixel-art app icons and a link-preview image drawn from the studio duck sprite (`scripts/make-brand-assets.py`), manifest (installable), theme colour.
- SEO: metadata base from `NEXT_PUBLIC_SITE_URL`, Open Graph/Twitter cards, `robots.txt` (Studio, API, rooms and shared links not indexed), `sitemap.xml`.
- `/about` case-study page, styled 404, footer links.
- Vercel Analytics (`@vercel/analytics`, active only on Vercel).
- Performance: every page is static except the two API routes; html-to-image loads only when exporting a PNG; no animation libraries.
- README rewritten.

## Phase 6 — Motion trial (branch `phase-6-motion`)

- Added Motion (`motion`): cards are driven by motion values with spring physics (`src/lib/physics.ts`, tuning in `feel.spring`).
  - Stamping: the card flies from your finger into the slot (spring, scaled to the slot), then lands with the thud.
  - Fling: keeps your throw velocity and glides out (inertia), spinning with the throw.
  - Snap-back starts with your release velocity; grabbing a card mid-animation continues from where it is.
  - The fan springs into place when a card leaves.
  - Speed mode, reduced motion and the hidden-tab fallback carry over.
- Bug fixes:
  - A card held a moment before dragging got crumpled and binned even when dropped on its slot; now a crumpled card dropped on a valid slot is smoothed out and stamped. Hold-to-crumple raised to 520 ms.
  - The crumple timer could stay armed after a press ended (lost pointer capture) and crumple a card nobody was touching; it now only fires while pressed, and lost capture springs the card home.
  - Local jam preview showed host tools to every guest; only the tab that opened the room is host now.
- Page turns and the forge still use the earlier animation code.

## Phase 7 — The pitch (branch `phase-7-pitch`)

Every walk now produces a **pitch** in one readable shape (see `docs/pitch-structure.md`):
title · tagline · genre · platform · details (short keyword lines: mechanic, world, mood, look, twist, rule, seed) · notes.

- Free order: open **Pitch** from the bottom bar anytime; tap a detail's 🎴 to walk straight to its stall; skip anything; type over any line. Filling one line never changes another.
- Title: type or 🎰 spin (names from your own keywords). Tagline: type or ✎ draft from the details. Genre/Platform: pick chips (itch.io genres) or 🎰 spin — you choose in the end. Notes: spark answers drop in automatically.
- New last stop on every street: **the Pitch Desk** (full editor + live card + copy as Markdown / itch.io text / save image).
- "READY TO PITCH" stamp when title, genre and 3 details are filled (a nudge, not a lock).
- The pitch card is what the receipt, book, share link, studio library and Jam Album show; the cards fold away under "The cards behind it".
- Jam Album: ⭐ Vote per pitch (not your own; enforced in the DB too), ranked by votes after close.
- DB: `spreads.pitch` column, `vote` reaction kind, no self-votes (34 checks).

## Known issues / next

- Jam card draws happen in the browser: coins are enforced on the server, but a modified client could draw without paying. Server-side draws (an API route that spends + draws + records pulls) would close that.

- Not verified against a live Supabase project or with a real Anthropic key (no keys here): the SQL is tested in PGlite, the TypeScript type-checks, the UI runs on the local backend.

- Holding still >420 ms before dragging crumples the card (by design, but may need tuning in `feel.ts`).
- "Flip all" stays visible after every card is up.
- Not yet play-tested on a real phone (only emulated).
- Spark pools are 8–12 per stop (plan: 15–30). Seed-type choice at the Gate (word / mechanic / mood) not built.

## Phase 8 — Cozy desk redesign (branch `phase-8-desk`)

Follows `docs/redesign-plan.md`. The street is replaced by a scrapbook of pages on a desk.

- **8.1 Foundation:** design tokens (walnut/amber/cream), Fraunces + Nunito, the Desk home (lamp, radio, book, envelopes), autosaving scrapbook store, shell with 12 pages (swipe / arrows / buttons / index sheet), progress that never decreases, Setup page, procedural radio (5 stations, opt-in, volume, mute), settings sheet.
- **8.2 Scrapbook experience:** `data/inspiration/*.json` + `npm run content:lint`; BoosterPack (envelope tear or tap, flip, keep / favorite / set aside, reroll, open another, write my own); pages: title (word tray + candidates), tagline (suggestions only from your own picks), high concept template, genre primary/secondary, mechanics, tap-to-build core loop with variations, objective, hook (twist combiner), moodboard (4 collections, primaries, notes), 10-point scope + Must/Nice/Cut.
- **8.3 Pitch:** pitch spread (only filled sections, edit links, "not in your pitch yet"), several concepts per scrapbook, Save as pitched, image export, print/PDF, copy as Markdown, share links v2 (validated on read; v1 links still open), old-pitch import, redirects (`/book`, `/prototype`, `/play`), new About and 404.
- **8.4 Pitch Wall:** cards with moodboard strip and counts, explore-first (no voting until a round starts), pass-the-phone voters, one vote each (changeable until close), anonymous option, results with winner/tie, compare two, comments. Everything is labelled "saved on this device"; `WallRepo` is the seam for a shared wall.

### Known gaps / next

- **Shared wall is not built.** The data layer is ready (`src/lib/wall/types.ts`), but a shared wall needs new Supabase tables (sessions, pitches, votes, comments), RLS and a join flow. Nothing in the UI claims sharing.
- Studio and Jam (from the first version) still use the old street (`src/components/route/*`, `/play?mode=`); they were not redesigned. The old street files are kept for them only.
- Not tried on a real phone (only in phone-sized browser windows); radio audio not listened to.
- Moodboard image references are not supported (text cards only).

## Phase 9 — Bring the feel back (branch `phase-9-feel`)

Follows `docs/feel-plan.md`: the desk's structure with the bazaar's game, no pixel UI.

- **9.1** `src/components/feel/`: DragCard + PackOpen lifted out of the street, generic, with a paper skin. Studio/Jam unchanged.
- **9.2** Pack pages are stalls with keepers (`keepers.ts`); drag cards onto the page (thud, tape, KEPT stamp), crumple / rip / fling into a bin you can fish from; duck reacts in a paper bubble.
- **9.3** Page curl: drag the corner, the page lifts with the next page underneath; buttons/keys/swipes play the same turn.
- **9.4** Rewards: page stamps in the top bar, section stickers, receipt, forge to a polaroid on the Close page.
- **9.5** Stall mini-games: Gear press (mechanics), Folded map (setting), Tarot (mood), Tailor reels (visual), Shell game (twist). Word, genre, objective and audio keep the envelope.

### Known gaps

- No two-page spread on desktop; stickers not on the desk's book cover; not tried on a real phone.
- The duck is still the small pixel sprite (the one planned drawn asset).

## Phase 10 — Pixel scrapbook, one screen per page (branch `phase-10-pixel`)

Follows `docs/phase-10-plan.md` (from phone testing). Supersedes Phase 9's "no pixel UI".

- **10.1** `src/styles/pixel.css` over desk.css: white paper, ink outlines, hard pixel shadows, pixel fonts; sharp duck (whole-number scale, no smoothing); big Back / Next bar; stepped page turn, no swipe or corner drag.
- **10.2–10.3** Short 10-page flow (jam, mechanics, loop, twist, mood & world, scope, genre, title, tagline, close); high concept, objective, audio and other options behind Settings → "Show extra pages". Packs are 4 cards in a 2×2 grid: tap to flip, tap to choose, Keep chosen; rest to the bin; kept cards taped on the page.
- **10.4** Title gacha (3 ideas per spin from the word bank + your picks); tagline as tap-to-use ideas; tagline off the front (close list, wall cards, polaroid).
- **10.5** Desk home, radio, lamp and pitch in pixels.
- **10.6** Checked at 375×667 and 390×844: no page scrolls, including with a pack open on Mood and Twist.

### Known gaps

- Not tried on a real phone yet. Long twist titles leave room for only a line of description on the 2×2 cards.
- Wall, About and sheets inherit the theme but weren't individually redesigned. Studio/Jam still use the old street look.
