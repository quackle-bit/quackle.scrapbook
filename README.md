# Quackle Scrapbook

A cozy desk for game ideas, by [Quackle.bit](https://quacklebit.com). Lives at
[quacklebit.com/scrapbook](https://quacklebit.com/scrapbook). Open packs, collect what sparks
something, stamp it into your scrapbook, and end up with a game pitch your team can read, compare and
vote on. **Less thinking. More tinkering.**

| Route (under `/scrapbook` when published) | What                                                                         |
| ----------------------------------------- | ---------------------------------------------------------------------------- |
| `/`                                       | The cover: Continue, your scrapbooks, radio, settings                        |
| `/book?id=&page=`                         | The scrapbook: 10 pages from your jam to closing the book                    |
| `/pitch?id=`                              | The pitch document: share image, link, text, print; asset list & notes       |
| `/s#…`                                    | A shared, read-only pitch (the pitch lives in the link itself)               |
| `/about`, `/jam-kit`                      | About quackle.bit, and a printable poster for jam organisers                 |
| `/studio`, `/jam`, `/wall`                | Studio, Jam rooms, Pitch Wall (need a server; not in the GitHub Pages build) |

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. Everything works without keys. Scrapbooks, the wall and votes are saved in the
browser (`localStorage`); share links carry the pitch inside the URL, so nothing is uploaded.

## Scripts

| Script                                  |                                                                 |
| --------------------------------------- | --------------------------------------------------------------- |
| `npm run dev` / `build` / `start`       | Next.js                                                         |
| `npm run lint` / `typecheck` / `format` | Quality                                                         |
| `npm run content:lint`                  | Checks the card content in `data/inspiration`                   |
| `npm run vocab:lint` / `vocab:sample`   | Older vocab banks (used by the Studio/Jam street)               |
| `npm run db:test`                       | Runs the Supabase migration in PGlite and checks every RLS rule |
| `python3 scripts/make-brand-assets.py`  | Regenerates icons + link-preview image from the duck sprite     |

## Where things live

- `data/inspiration/*.json`: all pack content (genres, mechanics, objectives, twists, moods, settings, visual/audio directions, words, tagline templates). Edit these to add cards.
- `src/lib/inspiration.ts`: loads content, draws packs (no duplicates), tagline suggestions from the user's own picks.
- `src/lib/scrapbook/`: data model (`types.ts`), autosaving store, pitch model + exports + share links (`pitch.ts`), old-pitch import.
- `src/lib/wall/`: `WallRepo` interface + the local implementation (a shared wall can plug in later).
- `src/components/desk/`, `scrapbook/`, `cards/`, `summary/`, `wall/`, `radio/`, `ui/`: the screens.
- `src/lib/radio.ts`: the radio's five stations, generated live with Web Audio (no audio files).
- `src/styles/desk.css`: the design system (tokens, desk scene, shell, cards, spread, wall, print).
- `docs/redesign-plan.md`: the plan this redesign followed.

## Going live

1. **Vercel:** import the GitHub repo; defaults are fine. Set `NEXT_PUBLIC_SITE_URL` to the final URL.
2. **Studio / Jam** (optional, from the first version): follow [`supabase/README.md`](supabase/README.md).

Keys go in `.env.local` locally (git-ignored) and in Vercel's environment variables; see `.env.example`.

See `CLAUDE.md` for the original plan and `PROGRESS.md` for what was built.
