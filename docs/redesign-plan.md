# Quackle Scrapbook: redesign implementation plan

Source brief: the "Product Requirements & Implementation Brief" (cozy desk, 8 stages, scrapbook of a
game concept, pitch wall). This plan maps that brief onto the **existing** codebase so it can be
executed phase by phase. Branch: `phase-8-desk` (from `phase-7-pitch`).

**For the executor:** follow the phases in order. Each phase ends with the checks in §9 and one
commit. Don't add dependencies. Mobile (375×812) is the primary test size. Read §2 (what to reuse)
before writing new code.

---

## 1. What changes, in one paragraph

The "street" (one stall after another) is replaced by a **scrapbook with pages** you can open in
any order, sitting on a **desk** home screen. Packs, card flips, trash gestures, stamping, sound,
motion and the pitch card are reused. The output is a structured **concept** (title, tagline, high
concept, genres, mechanics, core loop, objective, hook, mood, setting, visual, audio, scope, MVP),
several concepts per scrapbook, shown on a **Pitch Wall** with local voting. The pixel/quirky skin is
replaced by a **cozy desk** visual system (walnut, amber, cream). The duck stays as a small,
quiet mascot (optional, see §8).

---

## 2. Reuse map (existing → new)

| Existing                                                              | Path                                         | Becomes                                                                                                                                                                                                                              |
| --------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Next.js 16 app, TS, ESLint/Prettier                                   | repo                                         | unchanged                                                                                                                                                                                                                            |
| Pack open/tear/fan/flip                                               | `src/components/PackStation.tsx`             | **`BoosterPack`**: generalized to any card type via a `draw()` prop (already has it), `bare` mode, Fresh/Wild removed. Used by Genre, Mechanics, Twist, Mood, Word packs                                                             |
| Card gestures (drag to stamp, crumple/rip/fling, tap → actions)       | `src/components/HandCard.tsx`                | **reused as-is** for pack cards. Its action row gets a ★ Favorite button. "Stamp" = keep into scrapbook; trash = discard                                                                                                             |
| Card face/back                                                        | `src/components/Card.tsx`                    | **restyled** (paper card, title + description + category). Rarity foil kept but subtle                                                                                                                                               |
| Spring physics, `play()`, haptics                                     | `src/lib/physics.ts`, `src/lib/motion.ts`    | unchanged                                                                                                                                                                                                                            |
| Synth SFX                                                             | `src/lib/sound.ts`                           | keep `thud`, `peel`, `riffle`, `tearOff`, `thup`, `tink`, `crumple`; tone volume down                                                                                                                                                |
| Settings (mute, speed, reduced motion)                                | `src/lib/settings.ts`                        | add `musicVolume`, `musicOn`, `station`                                                                                                                                                                                              |
| Seeded RNG                                                            | `src/lib/rng.ts`                             | unchanged (no-duplicate draws)                                                                                                                                                                                                       |
| External-store + localStorage pattern                                 | `src/lib/store.ts`                           | **new `src/lib/scrapbook/store.ts`** written in the same style (versioned key, autosave, `useSyncExternalStore`)                                                                                                                     |
| Page-turn viewer (swipe, ←/→, page swing)                             | `src/components/book/BookViewer.tsx`         | turn logic extracted into **`usePageTurn`** hook, reused by the scrapbook pages                                                                                                                                                      |
| Pitch card + editor                                                   | `src/components/pitch/*`, `src/lib/pitch.ts` | **PitchCard** becomes the Pitch Wall card / summary renderer for the new `Concept`; `PitchEditor` is retired (pages replace it)                                                                                                      |
| Spin helper (`useSpin`)                                               | `PitchEditor.tsx`                            | moved to `src/components/ui/useSpin.ts`, used by Word Pack title combiner and "reroll"                                                                                                                                               |
| Export PNG / Markdown                                                 | `src/lib/export.ts`                          | reused; add `conceptMarkdown()`; PDF via print stylesheet (no dependency)                                                                                                                                                            |
| Share links in URL hash                                               | `src/lib/share.ts`, `src/app/s`              | extended to encode a `Concept` (schema v2; keep v1 decode)                                                                                                                                                                           |
| Duck sprite + quack                                                   | `src/components/Duck.tsx`, `public/duck`     | small corner mascot with _rare_ tips (optional)                                                                                                                                                                                      |
| Vocab banks                                                           | `data/vocab/*.json`                          | source material for the new `data/inspiration/*.json` (§5)                                                                                                                                                                           |
| Studio, Jam, Supabase, Appraiser                                      | `src/lib/studio`, `src/lib/jam`, `supabase/` | **kept, not touched in phases 1–3.** Phase 4 reuses jam rooms + voting tables for shared Pitch Walls                                                                                                                                 |
| Street (`Route.tsx`, `route.ts`, stops, Gate, Forge, Receipt, alleys) | `src/components/route/*`, `src/lib/route.ts` | **retired** at the end of Phase 3 (moved to `src/legacy/` first, deleted once nothing imports it). Mini-games `GearPress`, `ShellGame`, `TailorReels`, `FoldedMap`, `Tarot` may return later as alternate pack openers; not in scope |

---

## 3. Routes

All pages are static client pages (read query params with `useSearchParams` inside `<Suspense>`,
as `src/app/play/page.tsx` already does; Next 16 requires it).

| Route                               | Screen                                                                             |
| ----------------------------------- | ---------------------------------------------------------------------------------- |
| `/`                                 | **The Desk** (home): lamp, radio, scrapbook, packs; Continue / New / My Scrapbooks |
| `/scrapbook?id=…&page=…`            | The scrapbook: all pages of the current concept                                    |
| `/scrapbook/summary?id=…&concept=…` | **Close the Scrapbook**: the pitch spread (Stage 07)                               |
| `/wall?id=…`                        | **Pitch Wall** (Stage 08)                                                          |
| `/s#…`                              | Shared read-only pitch (existing route, new renderer)                              |
| `/about`                            | keep, update copy                                                                  |
| `/studio`, `/jam`, `/jam/room`      | keep as-is until Phase 4                                                           |
| `/play`, `/book`, `/prototype`      | redirect to `/` after Phase 3 (`next.config` `redirects`)                          |

---

## 4. Data model (`src/lib/scrapbook/types.ts`)

Follows brief §15; IDs are stable strings (`nanoid`-style from `freshSeed()`, no new dependency).

```ts
type Scrapbook = {
  id;
  name;
  jamTheme;
  platforms: string[];
  duration: Duration;
  customDuration?: string;
  teamSize: TeamSize;
  restrictions: string;
  conceptIds: string[];
  activeConceptId: string;
  collected: CollectedCard[]; // shared collection across concepts (cards are reusable)
  progress: { visitedPages: PageId[]; packsOpened: number }; // never decreases
  createdAt;
  updatedAt;
};
type Concept = {
  id;
  scrapbookId;
  title: string;
  titleCandidates: string[];
  tagline: string;
  highConcept: string;
  genres: { primary?: CardRef; secondary?: CardRef };
  mechanics: CardRef[];
  coreLoops: CoreLoop[];
  activeLoopId?: string;
  objective: string;
  uniqueHook: string;
  hookTwists: CardRef[];
  mood: CardRef[];
  setting: CardRef[];
  visualDirection: CardRef[];
  audioDirection: CardRef[];
  primary: { mood?: string; setting?: string; visual?: string; audio?: string }; // card ids
  scope: Record<ScopeArea, number>; // 10 points total, optional
  mvp: { must: string[]; nice: string[]; cut: string[] };
  status: "draft" | "pitched";
  createdAt;
  updatedAt;
};
type CollectedCard = {
  // a card the user kept (from a pack) or wrote (custom)
  id;
  type: CardType;
  title;
  description;
  category?;
  source: "pack" | "custom" | "recommendation";
  isFavorite: boolean;
  contentId?: string /* inspiration id if from a pack */;
};
type CardRef = string; // CollectedCard.id
type CoreLoop = { id; name; steps: { id; label; cardId?: string }[] };
type VotingSession = {
  id;
  scrapbookId;
  conceptIds;
  votes: { voter: string; conceptId: string }[];
  status: "open" | "closed";
  anonymous: boolean;
  round: number;
};
type Comment = { id; conceptId; author: string; body; at };
```

- **Authored vs collected vs arranged** stays distinguishable: authored = plain strings on `Concept`;
  collected = `CollectedCard` with `source`; arranged = `CoreLoop`, `mvp`, `scope`, `primary`.
- **Nothing is auto-filled.** Suggestions only enter a field when the user taps them.
- Store: `src/lib/scrapbook/store.ts`, key `qs.scrapbooks.v1`, debounce-free autosave on every
  action (writes are small), `lastScrapbookId` for Continue. Pitch Wall votes/comments under
  `qs.wall.v1`, clearly labelled **"on this device"** (brief §12: don't pretend they're shared).
- One-time import: if the old `qs.book.v1` exists, offer "Import 3 old pitches" on the desk
  (maps old `Pitch` → `Concept`: title, tagline, genre, detail lines → mechanics/hook/setting text).

---

## 5. Content (`data/inspiration/*.json`)

Schema for every file (validated by an extended `scripts/vocab.mts`, new script `content:lint`):

```json
{
  "type": "mechanic",
  "cards": [
    {
      "id": "mech-time-rewind",
      "title": "Time Rewind",
      "description": "Reverse the last action or rewind a short period.",
      "category": "time",
      "tags": ["time", "puzzle"],
      "rarity": "uncommon"
    }
  ]
}
```

| File                              | Count (first version) | Source                                                                                                                                                                                                                  |
| --------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `genres.json`                     | ~30                   | brief list + itch.io genres                                                                                                                                                                                             |
| `mechanics.json`                  | ~80                   | rewrite `data/vocab/mechanics.json` + `verbs.json` as named mechanics **with descriptions** (brief examples first: Time Rewind, Magnetism, Duplication, Body Swap, Visibility, Gravity Manipulation, Crafting, Trading) |
| `objectives.json`                 | ~40                   | new (brief examples)                                                                                                                                                                                                    |
| `twists.json`                     | ~50                   | `data/vocab/twists.json` + brief examples, as design hooks                                                                                                                                                              |
| `moods.json`                      | ~25                   | single-word moods (brief list)                                                                                                                                                                                          |
| `settings.json`                   | ~40                   | `world-places.json` + brief list                                                                                                                                                                                        |
| `visual-directions.json`          | ~20                   | brief list + `look-*.json`                                                                                                                                                                                              |
| `audio-directions.json`           | ~15                   | brief list                                                                                                                                                                                                              |
| `word-packs.json`                 | ~300 words            | `seed-objects.json` + evocative nouns/adjectives for titles                                                                                                                                                             |
| `taglines.json` / `starters.json` | ~30                   | sentence starters ("In a world where…", "Every …")                                                                                                                                                                      |
| `loop-verbs.json`                 | ~40                   | EXPLORE, COLLECT, CRAFT, DEFEND, UPGRADE… for loop steps                                                                                                                                                                |

Draws: `src/lib/inspiration.ts` — `drawPack(type, n, rng, exclude[])` with no duplicates within a pack
and excluding cards already collected for that concept. Old `src/lib/deck.ts` stays for legacy code
until Phase 3 cleanup.

---

## 6. Screens and components

### Shell

- `src/components/desk/DeskScene.tsx`: CSS-only desk (walnut wood grain gradient, lamp glow as a
  radial amber gradient that flickers subtly, scattered packs as small paper envelopes). No images
  required; the duck may sit on the desk.
- `src/components/scrapbook/ScrapbookShell.tsx`: the open book on the desk; top bar (project name,
  progress "7 / 12 pages"), page area, **bottom nav**: ‹ prev · page index (bottom sheet) · next ›.
  Swipe left/right turns pages (`usePageTurn`, extracted from BookViewer).
- `src/components/ui/BottomSheet.tsx`: one reusable sheet (page index, card actions, radio).
- `src/components/ui/Chips.tsx`, `TextField.tsx`, `Suggestions.tsx` (tap-to-insert suggestion chips).
- `src/components/radio/Radio.tsx` + `src/lib/radio.ts` (see §7).

### Pages (`src/components/scrapbook/pages/*`), 12 pages, all skippable

| #   | Page                | Content type                | Built from                                                                                                                                                                                               |
| --- | ------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Setup               | form                        | Chips (platform multi, duration incl. custom, team size), TextFields (name, jam theme, restrictions)                                                                                                     |
| 2   | Title               | authored + word pack        | TextField + **Word Pack** (BoosterPack of words): tap words to drop them into a "combiner" tray, tap to reorder, "save as candidate"; candidates list with ★ pick favorite                               |
| 3   | Tagline             | authored + suggestions      | TextField + sentence starters + 3 suggested taglines built _only_ from the user's own fields (shown as suggestions, never auto-applied)                                                                  |
| 4   | High concept        | guided typing               | Template with 3 inline blanks "You play as [PLAYER] who must [OBJECTIVE] in a world where [TWIST]" ⇄ "write freely" toggle                                                                               |
| 5   | Genre               | booster pack                | BoosterPack(genres, 5) → keep → assign Primary/Secondary in a bottom sheet; custom genre; reroll                                                                                                         |
| 6   | Mechanics           | booster packs               | BoosterPack(mechanics, 5), keep/discard/★, "open another", custom mechanic card; collected mechanics shown as stamped cards on the page                                                                  |
| 7   | Core loop           | arranged                    | **LoopBuilder**: tap a collected mechanic or a loop-verb chip to append a step; each step has ↑ ↓ ✕ and inline rename; arrow connectors; "save as variation" + variation tabs. No drag-and-drop required |
| 8   | Objective           | recommendations + typing    | 6 suggestion cards (tap to use, editable) + "shuffle" + TextField                                                                                                                                        |
| 9   | Unique hook         | twist pack + typing         | BoosterPack(twists, 3); kept twists listed; "combine with" a collected mechanic (pick from chips) writes a draft line _only when tapped_; TextField                                                      |
| 10  | Mood & world        | moodboard                   | 4 tabs (Mood, Setting, Visual, Audio): small packs or recommendation grids; collected cards pinned on a cork/paper board; ★ and "primary" per tab; optional note per card; image references deferred     |
| 11  | Scope & MVP         | allocation + prioritization | 10-point allocator (− / + per area, remaining counter) and 3 lists Must/Nice/Cut with add, move between lists (buttons), remove                                                                          |
| 12  | Close the scrapbook | summary                     | link to `/scrapbook/summary`                                                                                                                                                                             |

### Summary (Stage 07): `src/components/summary/PitchSpread.tsx`

- Scrapbook-spread layout; **only renders fields that have content** (brief: don't invent).
- Each section has ✎ which navigates to its page. Actions: Save (mark `pitched`), Duplicate
  concept, New concept, Export image (`spreadPng`), Export PDF (`window.print()` with
  `@media print` stylesheet), Share link (share.ts v2).
- Concepts switcher at the top (multiple concepts per scrapbook).

### Pitch Wall (Stage 08): `src/components/wall/PitchWall.tsx`

- Grid (1 column on mobile) of pitch cards: title, tagline, genre, short concept, moodboard strip
  (colours/labels of primary mood/visual), vote count.
- Open full pitch (reuses PitchSpread read-only). Compare: pick 2, side-by-side (stacked on mobile).
- Local voting: "Who's voting?" name prompt per device-pass (pass-the-phone), one vote per voter per
  round, change vote while open, anonymous toggle, close round → results with winner highlighted,
  "new round". Comments per concept (name + text). All labelled **"saved on this device"**.
- Data layer behind an interface `WallRepo` (`LocalWallRepo` now) so Phase 4 can add a shared
  backend without UI changes.

---

## 7. Radio (original audio, no files)

Brief requires original/licensed audio and opt-in playback. Use Web Audio (already used for SFX):
`src/lib/radio.ts` generates five **procedural** stations, started only after the user presses Play:

| Station          | Recipe (all quiet, looping, no samples)                                               |
| ---------------- | ------------------------------------------------------------------------------------- |
| Midnight Lo-fi   | slow 4-chord progression (soft triangle + low-pass), vinyl crackle noise, sparse kick |
| Rainy Afternoon  | filtered pink-noise rain + occasional droplets + soft pad                             |
| Quiet Morning    | major-7th pad, slow random bell notes                                                 |
| Dusty Jazz       | walking bass (sine) + brushed noise + extended chords                                 |
| Late Night Study | brown-noise hum + very slow pad                                                       |

Controls: play/pause, station, volume, mute (shares the global mute). Fade in/out 1.5 s. Radio UI is
a small object on the desk and in the scrapbook top bar.

---

## 8. Visual system

- **Replace** the pixel skin (`--pxb` borders, Silkscreen everywhere) with tokens in a new
  `src/styles/desk.css`:
  `--walnut #3b2a20, --walnut-2 #2a1d16, --amber #e8a849, --cream #f3ead8, --paper #faf4e6,
--olive #7b7f4a, --dusty-blue #6f8aa3, --terracotta #c4623f, --burgundy #7d2e3b, --ink #2e2621`.
- Fonts (Google, via `next/font`): display **Fraunces** (serif, warm), body **Nunito** (rounded,
  readable), notes **Caveat** (existing). Silkscreen kept only for stamp labels (optional).
- Paper: cream page with subtle grain (existing SVG noise), soft drop shadows, washi tape on kept
  cards (existing `.tape` reused, recoloured), rubber-stamp marks in burgundy.
- Contrast: body text on paper ≥ 4.5:1; the dark desk never sits behind text.
- Motion: page turn, card land, envelope open; all respect reduced motion + speed (existing).
- **Decision to confirm (default chosen):** the duck stays as a small mascot on the desk and gives
  at most one tip per page when the user is idle for 20 s; no "QUACK!" spam. Trash sound becomes a
  soft paper crumple.

---

## 9. Phases (one commit each; run the checks every time)

**Checks:** `npm run lint` (0 errors) · `npm run typecheck` · `npm run build` · `npm run db:test`
· `npm run content:lint` (from Phase 2) · manual test at 375×812 in the browser pane following the
phase's acceptance list. Use a background browser tab for testing; hidden tabs pause animations
(the code already falls back on timers).

### Phase 8.1: Foundation

1. `desk.css` tokens + fonts; `layout.tsx` font swap (keep variables names `--font-body`, add `--font-display`).
2. Scrapbook types + store + autosave + `lastScrapbookId`.
3. Desk home (`/`): Continue (disabled if none), New Scrapbook, My Scrapbooks (bottom sheet list with rename/delete-with-confirm).
4. `ScrapbookShell` with page index, prev/next, swipe, progress (visited pages; never decreases).
5. Radio UI + `radio.ts` (stations, play/pause, volume, mute; opt-in).
6. Settings sheet: reduced motion, sound effects, music volume, speed.
   **Accept:** new scrapbook → navigate 12 empty pages in any order → reload → state restored; radio plays only after tap; no horizontal scroll at 375 px.

### Phase 8.2: Scrapbook experience

1. `data/inspiration/*.json` + `content:lint` + `src/lib/inspiration.ts`.
2. BoosterPack (from PackStation) + HandCard favorites + collected-card shelf.
3. Pages 1–11 as specified in §6.
   **Accept:** open a mechanics pack, keep 2, favourite 1, discard 1, add a custom mechanic; build a loop of 5 steps, reorder, save a second variation; fill moodboard primary picks; allocate 10 points; Must/Nice/Cut lists; every page skippable; nothing auto-filled.

### Phase 8.3: Pitch generation

1. PitchSpread summary (only filled sections, ✎ links), multiple concepts, duplicate, new concept.
2. Export image, print/PDF stylesheet, share link v2 (+ v1 compatibility), `/s` renderer.
3. Move street code to `src/legacy/`, add redirects for `/play`, `/book`, `/prototype`; old-book import on the desk.
   **Accept:** two concepts in one scrapbook, both exportable; shared link opens read-only on a fresh browser; `/play` redirects.

### Phase 8.4: Pitch Wall (local) + team-ready seams

1. PitchWall, open/compare, local voting rounds, comments, `WallRepo` interface.
2. Seam for shared sessions: map `WallRepo` onto the existing jam backend (`src/lib/jam`, Supabase `rooms`/`spreads.pitch`/`reactions('vote')`) behind a feature check; local stays the default. Don't claim sharing in the UI unless Supabase is configured.
   **Accept:** 3 voters on one phone vote, change a vote, close the round, see the winner; comments persist; UI states "votes on this device".

---

## 10. Definition of done (brief §19)

A user on a phone can: open the app → start a new scrapbook → configure a jam → explore and collect
inspiration → open mechanics packs → build a loop → make a moodboard → define an MVP → generate a
pitch → create more concepts → save and come back later. Plus: Pitch Wall with local voting.

## 11. Out of scope for this redesign

AI generation (the Appraiser stays a Studio feature, never required), image uploads for moodboard
references, real-time multi-device editing, accounts. Studio and Jam pages keep working unchanged
until Phase 8.4 connects the wall.
