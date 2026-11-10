# Handoff: copying quackle.scrapbook into the web repo

For the session that copies this project into the website repo and pushes it.

## What to copy

- **Source:** `/Users/rendyrayana/Documents/GitHub/quackle.scrapbook`, branch **`phase-10-pixel`** (the latest work; `main` is
  56 commits behind and was never merged into). Nothing has been pushed from here.
- **Copy only tracked files** (198 files). The simplest way is to export the branch, which skips everything git-ignored:

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

All four pass on `phase-10-pixel` (lint has 15 warnings, 0 errors).

## Hosting on GitHub Pages (not done yet)

GitHub Pages only serves static files. The scrapbook itself (desk, the 10 pages, packs, pitch, share image, share
links) runs fully in the browser and stores data in localStorage, so it can be static. These parts need a server and
**will not work on GitHub Pages** as they are:

- `src/app/api/appraise` (the Claude Appraiser API route)
- `src/app/auth`, `src/app/studio` (login and the Studio library, via Supabase)
- `src/app/jam` (Jam rooms, via Supabase)
- `src/app/wall` (the Pitch Wall; already unlinked, local-only)

To deploy there, the app needs a static export (`output: "export"` in `next.config.ts`, a `basePath` matching the repo
path, and the server-only routes above removed or moved out). That work has not been started.

## Where things stand

See `PROGRESS.md` (Phase 10 and 10.7+) for what was built and the known gaps. The latest commit on the branch is the
blank-sheet page turn (content fades out, a blank sheet swings, new content fades in), which still needs checking on a
real phone for the old blink.
