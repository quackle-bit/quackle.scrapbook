# quackle.scrapbook

A game-idea toy by [quackle.bit](https://quacklebit.com). You're a card hunter on a market street:
open card packs, **QUACK** the bad ideas into the bin, tape the good ones into your scrapbook, and
forge each finished spread into a pixel-art game concept.

| Route        | What                                                                     |
| ------------ | ------------------------------------------------------------------------ |
| `/`          | Home                                                                     |
| `/play`      | The street (Visitor). `?mode=jam` / `?mode=studio` for the other streets |
| `/book`      | Your local book: cover, spreads, discard pile, collection                |
| `/s#…`       | A read-only shared spread (encoded in the URL hash)                      |
| `/studio`    | Studio library, Back Room, Ledger, Appraiser (members)                   |
| `/jam`       | Jam rooms: join with a code, or open one (members)                       |
| `/about`     | Case study                                                               |
| `/prototype` | The original feel lab                                                    |

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. Everything works without any keys: Studio and Jam run as **local
previews** (Jam: open the room in a second tab to play as a second guest).

## Scripts

| Script                                       |                                                                 |
| -------------------------------------------- | --------------------------------------------------------------- |
| `npm run dev` / `build` / `start`            | Next.js                                                         |
| `npm run lint` / `typecheck` / `format`      | Quality                                                         |
| `npm run vocab:lint` / `vocab:sample [seed]` | Card banks in `data/vocab`                                      |
| `npm run db:test`                            | Runs the Supabase migration in PGlite and checks every RLS rule |
| `python3 scripts/make-brand-assets.py`       | Regenerates icons + link-preview image from the duck sprite     |

## Going live

1. **Vercel:** import the GitHub repo; defaults are fine. Set `NEXT_PUBLIC_SITE_URL` to the final URL.
2. **Supabase** (Studio + Jam): follow [`supabase/README.md`](supabase/README.md).
3. **Claude Appraiser:** set `ANTHROPIC_API_KEY` on the server (never `NEXT_PUBLIC_`).

Keys go in `.env.local` locally (git-ignored) and in Vercel's environment variables; see `.env.example`.

## Where things live

- `src/feel.ts`: every timing, gesture threshold and sound level.
- `src/lib/deck.ts`, `data/vocab/`: cards, packs, the Back Room, pool rules.
- `src/lib/route.ts`: stops, streets per mode, spark questions, weather.
- `src/components/route/`: the street and every stop's mini-game.
- `src/lib/store.ts`: the visitor's local book and daily coins.
- `src/lib/studio/`, `src/lib/jam/`: local and Supabase backends behind one interface each.
- `src/lib/server/appraiser.ts`, `src/app/api/appraise/`: the Appraiser (server-only).
- `supabase/migrations/`: schema, RLS and server-side rules.

See `CLAUDE.md` for the original plan and `PROGRESS.md` for what was built, phase by phase.
