# Pitch structure plan (draft for review)

**Goal:** every walk down the street ends with a **game pitch you can hand to the team**,
not just a polaroid. Keep the fun parts (packs, trashing, stamping); make the output structured.

**Rule of thumb:** _cards inspire, fields decide._ Gamified steps generate options; a short typed
or picked field turns each choice into a pitch line.

## 1. The pitch sheet (the end product)

Modelled on an itch.io project page + a one-page GDD + a short pitch. The order below is the order of the final sheet.

| #   | Section                            | Like itch.io / GDD                            | How it's filled                                                        | Input                                  |
| --- | ---------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------- |
| 1   | **Title**                          | itch: Title                                   | Forge offers 3 options from the cards                                  | 🎴 pick + ✏️ edit                      |
| 2   | **Tagline** (≤ 90 chars)           | itch: Short description                       | Pre-filled: "A [verb] game about [seed] in [world]"                    | ✏️ edit (required)                     |
| 3   | **Genre**                          | itch: Genre                                   | Suggested from the verb/mechanic card                                  | ☑️ pick 1 (itch's genre list)          |
| 4   | **Tags**                           | itch: Tags                                    | Auto from card tags                                                    | ☑️ pick/remove chips, max 5            |
| 5   | **Elevator pitch** (2–3 sentences) | Pitch: the hook                               | Pre-filled from cards + twist                                          | ✏️ edit (required)                     |
| 6   | **Core loop**                      | GDD: Core loop                                | Verb card → "Player **does** __ to **get** __, which **lets them** __" | 🎴 + ✏️ 3 short blanks                 |
| 7   | **Player fantasy / feel**          | GDD: Experience goals                         | Mood card → "The player feels __"                                      | 🎴 + ✏️ one line                       |
| 8   | **Pillars** (3)                    | GDD: Design pillars                           | Suggested from mood + twist + constraint                               | ✏️ three short lines                   |
| 9   | **World & tone**                   | GDD: Setting                                  | World card (place · era · inhabitant)                                  | 🎴 + ✏️ one line                       |
| 10  | **Look**                           | GDD: Art direction                            | Tailor reels + palette                                                 | 🎴 + auto palette                      |
| 11  | **Hook / what's different**        | Pitch: USP                                    | Twist card                                                             | 🎴 + ✏️ "Unlike most __, this __"      |
| 12  | **Comparables**                    | Pitch: comps                                  | "It's __ meets __"                                                     | ✏️ two short fields                    |
| 13  | **Audience**                       | Pitch: who for                                | Pick + optional line                                                   | ☑️ (casual / core / kids / jam crowd…) |
| 14  | **Platform · session · players**   | itch: Platforms, Average session, Multiplayer | Quick picks                                                            | ☑️                                     |
| 15  | **Scope**                          | GDD: Scope                                    | Ledger estimate (hours, tier) + constraint card                        | auto + ☑️ team size / time             |
| 16  | **Risks & open questions**         | GDD: Risks                                    | Ledger risks (+ Appraiser in Studio)                                   | auto + ✏️                              |
| 17  | **Cover**                          | itch: Cover image                             | Polaroid from palette + title (PNG)                                    | auto                                   |

Legend: 🎴 gamified (cards / mini-game) · ✏️ typed · ☑️ picked from a list · auto = generated.

A **completeness meter** shows required fields filled (title, tagline, genre, elevator pitch,
core loop, fantasy). When they're all filled the sheet gets a **"READY TO PITCH"** stamp.

## 2. How the street maps onto it

Each stop keeps its mini-game and replaces the optional spark question with **one targeted field**
for its pitch section, pre-filled where possible so it's a quick edit, not a blank page.

| Stop                            | Card (gamified) | Field it asks right after stamping                                  |
| ------------------------------- | --------------- | ------------------------------------------------------------------- |
| Gate                            | —               | Genre (pick) · Audience (pick) · "Not making…" (anti-goal)          |
| Word Merchant                   | Seed            | Tagline draft                                                       |
| Gear Booth                      | Core verb       | Core loop (3 blanks)                                                |
| Mapmaker                        | World           | World & tone line                                                   |
| Fortune Teller                  | Mood            | Player fantasy line                                                 |
| Tailor                          | Look            | (none: auto)                                                        |
| Trickster                       | Twist           | Hook: "Unlike most __, this __"                                     |
| Rulekeeper                      | Constraint      | Scope picks (team size, time)                                       |
| Forge                           | Concept         | Title pick + elevator pitch edit                                    |
| **Pitch Desk (new, last stop)** | —               | Review the whole sheet, fill gaps, comps, pillars, platform; export |

Visitor and Jam streets are shorter, so their sheets use a **short form** (title, tagline, genre,
elevator pitch, core loop, look, hook). Studio uses the **full form**.

## 3. Output and sharing

- **Pitch sheet view:** a clean, readable page, replacing the polaroid as the "result" (the polaroid stays as the cover).
- **Exports:** Markdown (pastes into Notion/Docs), PDF/PNG one-pager, and an itch.io-ready text block (title, short description, genre, tags, description).
- **Share link** shows the sheet; the Jam Album shows sheets, which makes voting and team forming meaningful.
- **Studio:** the Appraiser reads the _sheet_ (better input) and can fill Risks, Pillars and an alternative hook on request.

## 4. Tone: from quirky to functional

Keep: packs, tear/flip, trash gestures, stamping, the duck (fewer lines).
Change:

- Duck talks less: one line per stop, none during typing.
- Clear labels over jokes: "Stop 3 · Core loop" next to "The Gear Booth"; keeper lines become hints that say what this stop decides.
- Weather, receipt and stickers are optional flourishes (Visitor only, or a setting).
- A calmer "Studio" visual option: less tilt and tape, more grid and readable type.

## 5. Suggested build order

1. **Pitch data model + sheet view + exports** (nothing else changes yet; existing spreads render as partial sheets).
2. **Stop fields:** swap spark questions for the targeted fields above, with pre-fill.
3. **Pitch Desk stop + completeness meter + "Ready to pitch".**
4. **Tone pass:** fewer duck lines, clearer labels, optional flourishes.
5. **Album/Studio:** sheets in the Jam Album, Appraiser on sheets, itch export.

## 6. Decisions needed

1. **Required fields:** is the short form above (7 fields) right for Visitor/Jam?
2. **Gamify Genre?** A genre picker (fast) or a "Genre stall" with cards (fun, slower)?
3. **Spark questions:** replace them fully with fields, or keep one optional spark per stop as well?
4. **Main export:** Markdown, PDF one-pager, or itch.io text first?
5. **Language:** English only, or EN/JP labels for the sheet?
