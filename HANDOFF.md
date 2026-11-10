# Handoff: copying quackle.scrapbook into the web repo

**Where it will live: [quacklebit.com/scrapbook](https://quacklebit.com/scrapbook).** Quackle Scrapbook is published on the
studio site under the `/scrapbook` path. Links in the app already point there (pitch image footer, About page, text
exports); see "The address" below for the build settings.

For the session that copies this project into the website repo and pushes it.

## What to copy

- **Source:** `/Users/rendyrayana/Documents/GitHub/quackle.scrapbook`, branch **`phase-10-pixel`** (the latest work; `main` is
  78 commits behind and was never merged into). Nothing has been pushed from here.
- **Copy only tracked files** (204 files). The simplest way is to export the branch, which skips everything git-ignored:

```bash
mkdir -p /path/to/web-repo/scrapbook
git -C /Users/rendyrayana/Documents/GitHub/quackle.scrapbook archive --format=tar phase-10-pixel \
  | tar -x -C /path/to/web-repo/scrapbook
```

Change `/path/to/web-repo/scrapbook` to where it belongs in the web repo. To check the list first:
`git -C /Users/rendyrayana/Documents/GitHub/quackle.scrapbook ls-files`.

- **Keep the `.gitignore`** (it is tracked, so the export brings it). It keeps secrets and build output out of the web repo too.

## Ignored files (all of them, and why none are copied)

These exist locally but are git-ignored. **Do not copy or commit them**; each one is generated again by the commands below.

| Path                   | What it is                          | Where it comes from       |
| ---------------------- | ----------------------------------- | ------------------------- |
| `node_modules/`        | Installed packages (hundreds of MB) | `npm ci`                  |
| `.next/`               | Next.js build and dev cache         | `npm run dev` / `build`   |
| `next-env.d.ts`        | Next.js type declarations           | `next dev` / `next build` |
| `tsconfig.tsbuildinfo` | TypeScript incremental build cache  | `npm run typecheck`       |

Also ignored by the rules, but **not present** on this machine: `.env*` (except `.env.example`), `/out/`, `/build`,
`/coverage`, `.vercel`, `*.pem`, `.DS_Store`, debug logs.

### Secrets

- There is **no `.env.local`** here, so there are no keys to copy. `.env.example` (tracked) is the empty template.
- Never commit a real `.env.local`. API keys go in `.env.local` and the hosting provider's settings, not in the repo.
- `ANTHROPIC_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are server-only and must never be prefixed with `NEXT_PUBLIC_`.

## Before pushing

Uses Node 24 (tested with v24.21.0). In the copied folder:

```bash
npm ci
```

```bash
npm run typecheck && npm run lint && npm run content:lint && npm run build
```

All four pass on `phase-10-pixel` (lint has 15 warnings, 0 errors). `npm ci` installs everything from
`package-lock.json`, including the packages added recently (all pinned to exact versions): `lucide-react` (icons),
`qrcode-generator` (QR code on the share image and jam kit) and `three` (the 3D page turn, loaded only on the first
page turn).

## Hosting on GitHub Pages (not done yet)

GitHub Pages only serves static files. The scrapbook itself (desk, the 10 pages, packs, pitch, share image, share
links) runs fully in the browser and stores data in localStorage, so it can be static. These parts need a server and
**will not work on GitHub Pages** as they are:

- `src/app/api/appraise` (the Claude Appraiser API route)
- `src/app/auth`, `src/app/studio` (login and the Studio library, via Supabase)
- `src/app/jam` (Jam rooms, via Supabase)
- `src/app/wall` (the Pitch Wall; already unlinked, local-only)

These are static and fine on GitHub Pages: the cover, the 10 scrapbook pages, the pitch page and share image, `/s`
(share links), `/about`, `/jam-kit` (printable poster) and the link-preview images (`opengraph-image.tsx`,
`twitter-image.tsx`, drawn at build time).

To deploy there, the app needs a static export (`output: "export"` in `next.config.ts`, a `basePath` matching the repo
path, and the server-only routes above removed or moved out). That work has not been started.

## The address: quacklebit.com/scrapbook

- `src/lib/site.ts` holds the public address (`PUBLIC_URL = https://quacklebit.com/scrapbook`), used by the pitch image
  footer, the About page, Copy as text and other exports, and (in production) page metadata and the sitemap.
- Because the app sits under `/scrapbook`, build it with the base path set. One variable drives both Next's `basePath`
  (in `next.config.ts`) and the share links (`/scrapbook/s#…`):

```bash
NEXT_PUBLIC_BASE_PATH=/scrapbook npm run build
```

This build passes. Local dev needs nothing: without the variable the app runs at `/` as before.

- The scrapbook's own pages then sit at `quacklebit.com/scrapbook/scrapbook?id=…` and the pitch at
  `quacklebit.com/scrapbook/scrapbook/summary?id=…`. That works; renaming those routes is optional cleanup.

## Where things stand

See `PROGRESS.md` for what was built and the known gaps. Highlights since the last handoff:

- **Page turn:** content fades out, the page switches, a 3D paper sheet (three.js, `src/lib/pageCurl3d.ts`) curls over
  the spine and fades past it, then the new content fades in. Needs a check on a real phone for the old blink.
  `window.__curlSlow = 10` in the console plays turns in slow motion (dev builds only).
- **Studio:** studio name, links and games live in `src/lib/studio.ts` (About page, duck lines, after-forge link, share
  image footer, jam kit). Socials are one link to quacklebit.com/social.
- **Pitch:** a formal pitch document with a red PITCHED seal; Share pitch image exports that same document with a QR code
  and `#quackleScrapbook`.
- **PC layout (900 px+ only, phones unchanged):** the scrapbook opens as a two-page spread on the green cutting mat, with
  a page index on the left, card-sized packs centred in the page and toys drawn at 1.5×.
- **Bigger decks:** about 1,170 cards across 9 decks; `npm run content:lint` enforces the minimums.
