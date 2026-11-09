# CLAUDE.md — quackle.scrapbook

> **This file is a reference, not a rulebook.** Everything below (the plan, the phases, the rules and the tech choices) is a starting direction from early planning. Use your judgment: if something here doesn't fit what we're actually building, is outdated, or a better approach exists, suggest it and go with what works best. The person you're working with has the final say, and their instructions in a session always win over this file.

## What this project is
quackle.scrapbook is a game-idea tool for the studio **quackle.bit**. You're a card hunter in a market street: you open card packs, trash bad ideas, and tape good ones into a scrapbook. Each finished spread is a game concept. Three modes share one codebase: **Visitor** (public, portfolio), **Jam** (event rooms with guests) and **Studio** (private, logged in).

## Suggested ways of working
- Working one phase per session (see the plan's build phases) tends to keep things focused.
- A short checklist before building, small commits on a branch per phase, and a pull request at the end make changes easy to review and undo.
- Check in before big changes: new heavy dependencies, data model changes, or anything that changes the core experience.
- At the end of a session, a short summary of what was done, what's left and any known issues helps the next session. Keeping it in a `PROGRESS.md` is optional.

## Design direction (adapt as needed)
- Little or no illustration: the tool is built mostly from typography, CSS shapes/patterns/gradients, SVG strokes, motion and sound. A small pixel duck icon is the only planned drawn asset.
- Fonts: a pixel display font for card words and titles, a handwriting font for notes, and a readable body font for UI.
- Scrapbook look: paper texture, washi tape, rubber-stamp marks, polaroid frames.
- One stop per screen rather than one page full of options.
- Feel: anticipation → action → reaction, short and skippable effects. Keeping timings in one config (e.g. `src/feel.ts`) makes tuning easy.
- Accessibility and mobile: keyboard use, visible focus, reduced-motion support, mute, speed mode, touch-friendly drag and swipe.
- Pixel art is the rule for the *game ideas* the tool generates, not for the tool's own UI.

## Things worth keeping (safety)
- Don't commit secrets. API keys go in `.env.local` (git-ignored) and the hosting provider's settings.
- Limits that matter (coins, card pools, Claude usage, room access) should be enforced on the server, not only in the browser.
- Call the Anthropic API only from server code, never from the browser.

---

# Reference plan

_The full plan from early planning follows. Treat it as a reference. Section numbers (§) refer to this plan._


> Replaces the earlier hatch, dabble, flock and bazaar plans. **Name: quackle.scrapbook (decided).** The bazaar stays as the *place* inside the tool: the market street where you hunt for cards to put in your scrapbook.

### Scrapbook look and feel (applies everywhere)
The name puts the **book** first, so the whole tool should feel handmade, like a real scrapbook. All of it is cheap to build with CSS, type and sound; no illustration.
- **Paper:** off-white pages with a subtle CSS noise texture, slightly uneven edges, a stitched or ring-bound spine.
- **Tape:** cards are held by **washi tape strips** (semi-transparent CSS rectangles with torn ends, colored by card type) instead of a plain stamp. Stamping a card = it lands, then a tape strip slaps over the corner with a sticky *thwip*.
- **Ink stamps:** date stamps, "KEPT", "QUACKED" and rarity stamps in a rubber-stamp style (rotated, slightly faded edges).
- **Handwriting:** notes and spark answers use a handwriting-style Google Font (e.g. *Caveat*, or *Yomogi* for Japanese), next to the pixel display font for card words.
- **Doodles:** the owner can add simple doodles: arrows, circles, stars and underlines drawn as SVG strokes with a pen tool. This adds personality with no art assets.
- **Polaroid frame:** the forged concept card sits in a polaroid-style frame with the title handwritten underneath.
- **Cover:** fabric- or kraft-paper texture, a pixel title label, and earned stickers as badges (e.g. "first Mythic", "10 ideas", "jam survivor").
- **Page turn:** a paper-flip sound plus a slight page curl.
- **Mode covers:** Visitor = a pocket notebook; Jam = a shared guestbook-style album; Studio = a big leather-bound studio archive with project tabs.

A game-idea tool for **quackle.bit**, presented as a story. You're a **card hunter** in a bazaar. You buy packs from stalls, open them, throw away bad ideas and **stamp the good ones into your book**. Each finished spread in the book is a game concept, and other people read your book by **swiping its pages**.

Pixel art is the one fixed rule for the *game ideas*. The *tool itself* uses almost no illustration: cards, the book and the stalls are built from typography, flat shapes, CSS motion and sound.

One codebase, three modes: **Visitor** (public portfolio page), **Jam** (event rooms) and **Studio** (private).

---

### 1. The story loop

```
 Enter bazaar → Visit a stall → Buy a pack (coins) → Open it
      ↑                                                  ↓
 Turn the page ← Stamp good card into book ← Look at cards → Trash bad card
      ↓
 Spread full → Forge the concept card → Book is readable and shareable
```

1. **You are a card hunter with a book.** On first visit you get an empty book with your name on the cover, a coin purse and a greeting duck: *"Quack. Empty book? Let's fix that."*
2. **Visit a stall.** Each stall sells one kind of card (§3).
3. **Buy a pack.** Spend a coin. The pack slides across the counter.
4. **Open it.** Drag to tear it open; 3–5 cards fan out face-down; flip them one by one (§5).
5. **React to each card:**
   - **Bad idea → trash it.** Crumple it, rip it or flick it into the bin. The duck yells *"QUACK!"* It's meant to feel good to reject things.
   - **Good idea → stamp it.** Drag it onto an empty slot in your book. *THUD.* An ink stamp with the date marks it, and the sticker sits slightly crooked like a real one.
6. **Keep going.** Fill the slots on the spread by visiting other stalls.
7. **Spread complete → Forge.** The stamped cards glow and fuse into a **concept card** on the right-hand page: the finished idea.
8. **Turn the page** to start the next idea. The book grows into your collection of game ideas.

---

### 1B. The Route: one stop at a time (never one full page)

The bazaar is **a street you walk down, one stall per screen**. You never see every stall or every slot at once. Each screen asks one small question, gives one small action and one small reward, then moves you on. The duck is your guide.

**Screen layout for every stop** (always the same, so it's easy to learn):
```
┌───────────────────────────────────────┐
│ ● ● ◉ ○ ○ ○ ○   Stop 3 of 7  [skip ›] │ ← route bar (street lamps lighting up)
│                                       │
│  [ THE MAPMAKER ]   "Where shall we   │ ← stall sign + keeper line
│                      go?"             │
│                                       │
│        (the stall's mini-game)        │ ← one interaction only
│                                       │
│  🦆 "Quick: what does this place      │ ← duck's spark question (optional)
│      sound like at night?" [ answer ] │
│                                       │
│  [book peek: only today's slot ▢]     │ ← bottom: just the slot being filled
└───────────────────────────────────────┘
```
- **Route bar:** small street lamps that light up as you complete stops. Satisfying progress without a checklist.
- **Book peek:** only the **one** slot for this stop is shown at the bottom. Drag the card down into it to stamp. The full book opens only at the end (or on demand).
- **Back / skip:** you can walk back to any lit lamp, or skip a stop (its slot stays empty or gets a "?" card).

### The stops, each with its own mini-game

Every stall opens cards in a slightly different way, so stop 6 doesn't feel like stop 1. All of them are cheap: CSS motion, type and sound, no illustration.

| # | Stop (stall) | Fills slot | Mini-game (how the cards are revealed) | Duck's spark question (thinking prompt) |
|---|---|---|---|---|
| 0 | **The Gate** | — | Name your book, choose its cover color, pick the **mode** (Jam / Studio) and the **seed type** (Word / Mechanic / Mood line / Surprise me). For Jam: the theme shows up written on the gate. | "What kind of game do you NOT want to make today?" (an anti-goal, written on the inside cover) |
| 1 | **The Word Merchant** | SEED | Classic **pack tear** + fan + flip. The first pack is free. | "Say the word out loud. What's the first thing you picture?" |
| 2 | **The Gear Booth** | CORE VERB | **Gear press:** 3 cards sit under a press, you pull a lever (drag down) and the press stamps them face-up one by one, *ka-chunk*. | "What does the player do with their hands 100 times?" |
| 3 | **The Mapmaker** | WORLD | **Folded map:** tap to unfold a paper map in 3 folds; each fold reveals one part (place → era → inhabitant). Keep the whole map or swap one part. | "What does this place sound like at night?" |
| 4 | **The Fortune Teller** | MOOD | **Tarot spread:** 3 face-down cards labeled *Past / Present / Future*. Flip them one by one; she reads them as one moody line. Keep the line or one card. | "Finish the sentence: *The player feels…*" |
| 5 | **The Tailor** | LOOK | **Three spinning reels** like a slot machine: **Dimension · Pixel treatment · Camera**. Stop each reel by tapping; lock any reel and respin the others (2 respins). A tiny palette swatch generates. | "Name one game whose look is close, and one thing you'd change." |
| 6 | **The Trickster** | TWIST | **Shell game:** a twist card hides under one of 3 cups, the cups shuffle, and you pick. Every cup has a twist, but the one you didn't pick is shown afterwards ("…or this"), which plants a second idea. | "How would this twist break your core verb?" |
| 7 | **The Rulekeeper** | CONSTRAINT | **Sealed scrolls:** pick 1 of 3 scrolls and break the wax seal (hold to press until it cracks). | "What's the first thing this rule forces you to cut?" |
| ★ | **The Forge** (end of street) | CONCEPT | The full spread opens for the first time, the stamps glow, and you hold to forge them into the concept card. Generate 3 title options; pick or write one. | "Pitch it to the duck in one sentence." |
| ☾ | **The Night Market** (optional) | — | Review screen: swap any card with a trashed one from today's discard pile, read the spark answers together, then close the book. | "Which card would you remove to make it simpler?" |

**Side alleys (optional detours):** small signposts between stops lead to bonus stalls: **The Mystery Crate** (one random card of any type, fills a FREE slot), **The Echo Well** (shout a word in, get back 5 related words, no cost), **The Mirror** (flips your current concept into its opposite to compare). Detours are always optional, so the main route stays short.

### Spark questions: how the thinking fits in
- One per stop, shown **after** the card is stamped, so the fun comes first and the question builds on it.
- The answer is optional and short (one line). Answers are saved on the right-hand page as handwritten-style notes.
- Each stop has a **pool of 15–30 questions** so they don't repeat. In Studio mode members can add their own.
- A **"Why?" button** on any stamped card asks the duck for 3 quick angles on that card (from a hand-written prompt list in Visitor/Jam; from Claude in Studio).

### Routes per mode
| | Visitor | Jam | Studio |
|---|---|---|---|
| Route | Short street: Gate → Word → Gear → Tailor → Trickster → Forge (5 stops) | **Sprint street:** Gate (theme) → Theme stall → Gear → Tailor → Trickster → Forge (5 stops), with a countdown lamp | **Full street:** all 7 stops + Night Market + side alleys |
| Time per stop | ~30 s | ~1 min with a stop timer | No timer |
| Spark questions | 1 per stop, skippable | 1 per stop, shown to the room on your album page | 1–3 per stop, plus custom questions |
| Ending | Forge + share card | Forge → page added to the Jam Album → vote | Forge → Night Market → Ledger (scope) → Appraiser (Claude) |

### Tiny touches that make each step feel crafted
- **Arrival line:** each keeper greets you differently depending on what you've already stamped ("Ah, a *lantern* person. I have just the thing.").
- **Weather on the street:** the background tint shifts with the MOOD card you stamp (fog, dusk, neon, rain drawn as simple CSS gradients and lines).
- **Receipt:** at the end you get a printed-receipt-style summary of what you bought, kept and trashed ("3 packs · 11 cards · 7 kept · 4 QUACKED"). Fun to screenshot and share.
- **Lamp lighting:** finishing a stop lights the lamp with a small *tink* and a warm glow. Finishing the whole street lights them all in a wave.

---

### 1C. Revising and redesigning an idea

A forged concept is never final. Revising has to be as easy and satisfying as making it.

| Tool | What it does | Feel |
|---|---|---|
| **Peel** | Peel any stamped card off the spread (drag a corner). The slot empties and the card goes to the discard pile. | Sticker-peel sound; the slot pulses again |
| **Revisit a stall** | Tap an empty slot → "Walk back to the Mapmaker" → you return to that one stop only, then come straight back. | The route bar lights only that lamp |
| **Swap from discard** | Pull any trashed card back out of the discard pile into a slot. | It un-crumples |
| **Lock & reroll** | Lock the cards you like and reroll the rest in one go (one coin per rerolled slot in Visitor/Jam). | Locked cards get a padlock stamp; the others shuffle |
| **Re-forge** | After any change, the concept card shows "changed" and you forge it again. Title options are regenerated; your notes stay. | Short forge animation |
| **Variant** ("Hatch a sibling") | Copy the spread to the next page as **v2**, keeping only the cards you choose. The two spreads link to each other ("v1 ↔ v2"). | The page copies with a carbon-paper effect |
| **Mirror** | Make a variant with the opposite of one card (cozy → grim, top-down → first-person). | The card flips like a mirror |
| **History** | Every forge is saved as a version; scroll back and restore one. (Studio: full history; Visitor: last 5.) | Old versions look like faded stamps |
| **Redesign** | Start the spread's route again from the Gate, keeping the cards as suggestions (each stall offers your old card plus new ones). | "Back to the street!" |
| **Edit text** | Rewrite any card's text by hand; it becomes a "hand-carved" card with its own look. | Pencil scratch sound |

**Rules:**
- Revising never costs your stamped cards; only rerolls and new packs cost coins.
- In Jam mode revisions are allowed until the market closes; after that the album page is locked.
- In Studio mode the Appraiser (Claude) can suggest *which* card to change: "Your twist fights your constraint; try revisiting the Trickster."

---

### 2. The book (the core object)

### 2.1 Structure
- **Cover:** owner name, book title (editable, e.g. "Rendy's Jam Ideas 2026"), a color, and a sticker count.
- **One spread = one game idea.**
  - **Left page: the sticker slots** (dashed outlines with labels):
    `SEED` · `CORE VERB` · `WORLD` · `MOOD` · `LOOK` · `TWIST` · `CONSTRAINT` (+ 1–2 `FREE` slots for anything)
  - **Right page: the concept.** The forged concept card (title, logline, palette strip, look dials) plus a handwriting-style notes area.
- **Back pages:**
  - **Discard pile:** trashed cards, recoverable. Nothing good is ever lost.
  - **Collection index:** every card ever pulled, with rarity counts.

### 2.2 Interaction
- **Swipe or drag a page corner** to turn it (a page-curl effect). Use a library such as `page-flip` (StPageFlip) or a CSS 3D transform. Arrow keys and buttons also work.
- **Readers** (anyone with the share link) can only turn pages, zoom into cards and react.
- **Owner** can stamp, peel off (with a satisfying peel sound), rearrange and write notes.
- Empty slots pulse softly when you hold a card that fits them.
- **Filling a slot** = the main reward: thud, ink stamp, tiny shake, and a progress tick ("5/7 stamped").

### 2.3 Why a book works
- It turns a loose brainstorm into a **collection** you're proud of. Completing things and owning things are both strong motivators.
- It's the **portfolio artifact**: a shareable, swipeable book of game ideas made with quackle.scrapbook.
- It keeps every idea in context: what you kept, what you threw away, and when.

---

### 3. The stalls

Each stall is a flat-colored booth: an awning drawn as CSS stripes, a pixel-font sign, a short line from the stall keeper (text only), and a pack price.

| Stall | Sells cards for slot | Flavor line |
|---|---|---|
| **The Word Merchant** | SEED (words) | "Fresh words! One coin a pack!" |
| **The Gear Booth** | CORE VERB / mechanics | "Every game needs an engine." |
| **The Mapmaker** | WORLD (place, era, inhabitant, sensory) | "Where shall we go?" |
| **The Fortune Teller** | MOOD (moody prose lines) | "I see… fog. And regret." |
| **The Tailor** | LOOK (dimension × pixel treatment × camera) | "Let's dress your game in pixels." |
| **The Trickster** | TWIST | "Want to make it weird?" |
| **The Rulekeeper** | CONSTRAINT | "Limits make it interesting." |
| **The Mystery Crate** | anything, random | "No refunds." |

- **Seed choice:** the first card can come from any stall. Starting from one word, one mechanic or one moody line are all valid. Later stalls lean toward cards related to what's already stamped (the "coherent" pull).
- **Pack temperature:** each stall sells two packs. **Fresh** (related to your stamps) and **Wild** (anything goes). It's a simple choice instead of a slider.

---

### 4. Cards (no illustration needed)

### 4.1 Anatomy
```
┌──────────────────┐
│ WORD        ◆◆◇  │ ← stall/type label + rarity pips
│                  │
│    LANTERN       │ ← the word in a big pixel display font
│                  │
│ cozy · light ·   │ ← tags in small type
│ domestic         │
│ ───────────────  │
│ "A light you     │ ← one flavor line (optional)
│  carry."         │
│ #0412      2026  │ ← serial number and year
└──────────────────┘
```
- Every card type gets its own **color and pattern** (CSS patterns: stripes, dots, grid, waves), so types are recognizable at a glance.
- **Look cards** show a tiny auto-generated swatch: palette blocks plus a dithered gradient, procedural rather than drawn.

### 4.2 Rarity (all CSS)
| Rarity | Treatment |
|---|---|
| Common | Flat card |
| Uncommon | Colored border, slight sheen on hover |
| Rare | **Holo foil**: a gradient that follows the cursor or phone tilt, plus sparkles |
| Mythic | Gold foil, animated border, slower reveal with a drumroll pause, special sound |

Rarity changes the **ceremony, not the usefulness**. A common card can be the best idea.

---

### 5. Feel spec: making cheap things satisfying

All effects use CSS transforms, simple particles (small squares) and short sounds.

**Buying**
- Click a pack: a coin flips from your purse (a few frames of CSS rotation), *clink*, and the pack slides onto the counter.

**Opening**
- **Tear:** drag across the top of the pack. The tear line follows your finger (a clip-path mask), a ripping sound rises in pitch, and the top flies off.
- **Fan:** cards slide out and fan face-down with a quick riffle sound.
- **Flip:** tap a card to flip it with a 3D rotate, a slight overshoot and a soft *thup*. Rare and Mythic cards **pause half-turned** for 300–600 ms before revealing.
- **Flip all** button for speed.

**Trash (the angry moment)**
Several satisfying ways to reject, all cheap:
- **Crumple:** hold on the card; it shrinks and wrinkles (scale plus jagged clip-path), then you flick it at the bin.
- **Rip:** swipe down the middle; it splits into two halves that fall away.
- **Flick:** drag it fast in any direction and it flies off screen spinning.
- The bin shakes, the duck shouts *"QUACK!"* (randomized lines: *"Nope." "Bad duck." "Next!"*), and a "rejected" counter goes up. Rejecting counts as progress too.
- Every trashed card goes to the **Discard pile** in the book, so it can be recovered.

**Stamp (the good moment)**
- Drag the card to a glowing slot. It **snaps** in with a small overshoot, then *THUD*: a 4 px screen shake, an ink-stamp mark (date + "KEPT") fades in over a corner, and a random rotation of ±3°.
- The progress tick updates. On the last slot of a spread, a short fanfare plays and the **Forge** button lights up.

**Forge (the finale for each idea)**
- The stamped cards lift off the left page, spin, merge into one card in the middle, flash, and land on the right page as the **concept card** with foil.
- The concept title is generated from the stamps (and, in Studio, polished by Claude). You can rename it.

**Global rules**
- Every action follows anticipation → action → reaction, each effect under 600 ms (forge ≈ 2 s), and every effect can be skipped by tapping.
- **Speed mode:** instant open, no animation, for when you just want to think.
- Sounds: about 12 short sounds, pitch-varied ±5%, with a mute toggle. Light phone vibration on tear, thud and forge.
- `prefers-reduced-motion` replaces shakes and spins with fades.
- The duck is text-only: speech lines in a bubble, with an optional tiny emoji-free pixel icon (a 16×16 sprite, the only art asset).

---

### 6. The three modes

### 6.1 Visitor (public, portfolio)
**Who:** anyone on the quackle.bit website. **Goal:** a fun toy that shows off the studio.
- **Coins:** 10 per day ("The bazaar closes at midnight. Come back tomorrow.").
- **Stalls:** all, but only common, uncommon and rare cards; no Mythic and no studio-only cards.
- **Book:** stored in the browser; up to 5 spreads.
- **Share:** "Share this spread" creates a read-only link (state encoded in the URL, or a short id in a public table with rate limits).
- **No Claude, no accounts.**
- A footer explains the tool and links to quackle.bit's work.

### 6.2 Jam mode (event rooms)
**Who:** jam participants invited by a studio member. **Goal:** fast, social, time-boxed ideation around a theme.
- A studio member **opens a Jam Bazaar**: theme, end time, guest cap, starting coins.
- **Guests join** with a room code and a nickname (anonymous auth, no full account).
- **Theme stall:** an extra stall selling cards made from the jam theme, and every pack includes one theme card.
- **Few coins** (e.g. 6). Every pack counts and you have to commit.
- **Market countdown:** "The bazaar closes in 14:59." When it closes, buying stops and you finish your spread with what you have.
- **Trading post:** guests can **swap cards** with each other (offer → accept). Very social, cheap to build.
- **Jam Album:** a shared book in which every guest's forged concept is a page. Everyone can swipe through it and react with a stamp (❤ / 🔥 / 🤔).
- **Team forming:** after the countdown, the top-voted pages get a "join this idea" button.
- **Limits for outsiders:** no Mythic or studio-only cards, no Claude (or 1 per guest), no access to the studio's books, the room becomes read-only when the jam ends, and studio members can hide pages or close the room.
- **Adopt:** studio members can copy any album page into a studio book, credited to the guest.
- **Jam cut list:** each forged concept gets a short "what to cut first for 48 h" list.

### 6.3 Studio mode (private)
**Who:** quackle.bit members (login with an allowlist). **Goal:** real pre-production thinking.
- **Coins:** unlimited, or a generous daily refill so choosing still feels meaningful (set in admin).
- **Back Room stall:** studio-only cards, including **Mythic** and the studio's own custom cards (members can **mint** cards for the deck, e.g. inside jokes, studio pillars, past project themes).
- **Library:** a shelf of books, one per project or theme, shared by the whole team. Teammates can stamp into a shared book.
- **The Appraiser** (Claude): on a forged concept, writes a one-page pitch, suggests 3 alternative twists, and flags risks.
- **The Ledger page:** an asset-scope estimate added to each spread (sprites × directions × frames, tiles, props, UI → hours and a tier), plus a milestone sketch.
- **Comments and votes** on spreads, and a "promote to project" status (Idea → Prototype → Production).
- **Export:** a spread as a PNG, as Markdown, or as a FigJam-friendly layout.

### 6.4 Mode comparison

| | Visitor | Jam guest | Studio |
|---|---|---|---|
| Coins | 10/day | ~6 per room | Unlimited or refill |
| Card pool | Common to rare | + theme stall | + Back Room, Mythic, custom cards |
| Book | 1 local book, 5 spreads | 1 spread, in the shared Jam Album | Shared library, unlimited |
| Trading | ❌ | ✅ | ✅ (between members) |
| Claude (Appraiser) | ❌ | ❌ / 1 | ✅ |
| Scope | ❌ | Cut list | Full Ledger |
| Share | Read-only link | Album link | Private or public link |
| Time limit | Daily reset | Market countdown | None |

Enforce every limit **on the server** (row-level security + API checks). Client-side counts are only for display.

---

### 7. Vocabulary system (unchanged from the previous plan, summarized)

- Tagged word banks in `/data/vocab/*.json`, entries `{ word, tags[], weight, rarity, studioOnly?, flavor? }`.
- Targets: objects 2,000+, places 600+, creatures 500+, phenomena 300+, abstract nouns 400+, materials 300+, verbs 800+, adjectives 1,500+, mechanics 250+, loop shapes 60+, twists 300+, constraints 150+ (tagged jam/studio), sensory details 400+, eras 80+.
- Tags: mood, sense, scale, domain, energy. **Fresh** packs = cards sharing 2+ tags with your stamps; **Wild** packs = no shared tags.
- Mood lines: a Tracery-style grammar with 200+ templates plus 100+ hand-written lines.
- Look cards: combinations of **Dimension** (2D · 2.5D · 3D world/2D actors · 2D world/3D actors · full 3D) × **Pixel treatment** (native sprites · low-res render target · pixel shader/dither · pixel textures on low-poly · voxels · 3D baked to sprites · pixel UI/FX over a non-pixel world) × **Camera** (top-down · ¾ · isometric · side · side + lanes · first-person · third-person · fixed diorama · free orbit), with difficulty notes on hard combinations.
- Source: WordNet (filtered) plus curated lists; Claude Code drafts, a human curates. A lint script checks duplicates, tags and sizes.
- Optional Japanese glosses for an EN/JP mode.

---

### 8. Tech stack (adjust to the existing site)

- **Framework:** match the quackle.bit site. If starting fresh: Next.js + React + TypeScript on Vercel.
- **Page turn:** `page-flip` (StPageFlip), or a custom CSS 3D page-curl.
- **Drag/fling/snap:** `@use-gesture/react` + `react-spring` (or Framer Motion) for physical-feeling motion.
- **Foil:** CSS `conic-gradient` / `linear-gradient` with `mix-blend-mode`, driven by pointer position or `DeviceOrientation` (ask permission on iOS).
- **Sound:** Howler.js or WebAudio; about 12 small files.
- **Randomness:** seeded RNG (`seedrandom`) so packs can be reproduced and links can be shared.
- **Data and auth:** Supabase (Postgres + row-level security, email allowlist for Studio, anonymous auth for Jam guests, Realtime for trading and the Jam Album).
- **Claude (Appraiser):** server route `/api/appraise`, key kept server-side, rate-limited per user.
- **Share images:** `html-to-image`, or `@vercel/og` for link previews.

---

### 9. Data model

```ts
type Card = {
  id: string; type: 'word'|'verb'|'world'|'mood'|'look'|'twist'|'constraint'|'custom'
  text: string; tags: string[]; rarity: 'common'|'uncommon'|'rare'|'mythic'
  flavor?: string; studioOnly?: boolean; mintedBy?: string; serial: number
}
type Pull = { id: string; cardId: string; ownerId: string; packId: string; status: 'stamped'|'trashed'|'held'; at: string }
type Book = { id: string; ownerKind: 'visitor'|'member'|'room'; ownerId: string; title: string; color: string; visibility: 'private'|'link'|'public' }
type Spread = {
  id: string; bookId: string; index: number
  slots: Partial<Record<'seed'|'verb'|'world'|'mood'|'look'|'twist'|'constraint'|'free1'|'free2', string /* pullId */>>
  concept?: { title: string; logline: string; palette: string[]; pitch?: string; ledger?: Ledger; cutList?: string[] }
  notes?: string; status?: 'idea'|'prototype'|'production'; createdBy: string
}
type Room = { id: string; code: string; theme: string; endsAt: string; guestCap: number; startCoins: number; closed: boolean; albumBookId: string }
type Trade = { id: string; roomId: string; fromPull: string; toPull: string; state: 'offered'|'accepted'|'declined' }
type Reaction = { spreadId: string; userId: string; kind: 'heart'|'fire'|'think' }
type Wallet = { ownerId: string; coins: number; refillAt: string }
```

---

### 10. Build phases (one Claude Code session each)

**Phase 0: Vocab and cards.** Generate the tagged banks, a rarity assignment and flavor lines; lint script; `vocab:sample`.
*Done when:* the banks hit their targets and the samples read well.

**Phase 1: Feel prototype.** One screen: buy → tear → fan → flip → trash (all three ways) → stamp into a 3-slot mini page → forge, with placeholder styling. Tune every timing into `feel.ts`. Then add **two** of the stop mini-games from §1B (suggested: the Tailor's reels and the Trickster's shell game) to check that the variety still feels good.

**Phase 1.5: The Route.** The step-by-step street from §1B: route bar with lamps, one stop per screen, the book-peek slot, back/skip, spark questions, per-mode routes, the remaining mini-games, side alleys, weather tint, receipt.
*Done when:* 5 people outside the project open 10 packs each and want to keep going.

**Phase 2: Visitor version.** The full bazaar (8 stalls, fresh/wild packs), the book with page turning, spreads, discard pile, collection index, coins with daily reset, local save, share links, speed mode, sound, reduced motion.

**Phase 3: Studio.** Auth allowlist, shared library, Back Room, custom card minting, the Appraiser (Claude), the Ledger, comments and votes, status tracking, export.

**Phase 4: Jam rooms.** Rooms and codes, anonymous guests, theme stall, countdown, trading post (Realtime), Jam Album, reactions, team forming, adopt-to-studio, server-side limits.

**Phase 5: Portfolio polish.** quackle.bit branding, link-preview images, analytics, performance, and a case-study page.

---

### 11. Starter prompts for Claude Code

**Phase 1 (feel prototype):**
> Read PLAN.md §1, §4 and §5. Build a single-screen prototype: a pack you buy with a coin, tear open by dragging (clip-path tear that follows the pointer), 5 cards that fan face-down and flip with a 3D rotate (rare cards pause half-turned), three trash gestures (crumple+flick, rip in half, fast fling) into a bin with a duck speech bubble, and drag-to-stamp into a 3-slot page with snap, a 4 px shake and an ink-stamp mark; finish with a forge animation. No illustration: typography, CSS patterns and foil gradients only. Put all timings in `feel.ts`. Use `@use-gesture/react` + `react-spring`. Respect prefers-reduced-motion; add mute and speed mode.

**Phase 2 (visitor version):**
> Read PLAN.md §2, §3, §6.1 and §7. Build the bazaar with the 8 stalls, fresh/wild packs drawn from `/data/vocab` via a seeded RNG, and the book with page-flip spreads (slots on the left, concept on the right), discard pile and collection index. Coins: 10 per day, stored locally. Add read-only share links for a spread.

**Phase 4 (jam rooms):**
> Read PLAN.md §6.2 and §9. Add jam rooms on Supabase: a studio member creates a room (theme, end time, guest cap, starting coins); guests join anonymously with a code and nickname; theme stall; market countdown; card trading over Realtime; a shared Jam Album book with reactions; adopt-to-studio. Enforce coin, card-pool and access limits with RLS and server checks.

---

### 12. Decisions to confirm

1. **Name:** quackle.scrapbook ✅ decided.
2. **Presentation:** card hunter + bazaar stalls + pack opening + trash/stamp + swipeable book (proposed).
3. **Slots per spread:** the 7 listed in §2.1 + 2 free slots, or fewer for jams (e.g. 4: seed, verb, look, twist)?
4. **Existing site stack** for quackle.bit (decides §8).
5. **Language:** EN only or EN/JP.
