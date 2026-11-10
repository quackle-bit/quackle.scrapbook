# Deploying Quackle Scrapbook

**Live at [quacklebit.com/scrapbook](https://quacklebit.com/scrapbook)**, published straight from this repo with GitHub
Pages. quacklebit.com is this account's GitHub Pages site, so any repo here with Pages turned on is served at
`quacklebit.com/<repo-name>`. Name the repo `scrapbook` to get `quacklebit.com/scrapbook`.

## How it deploys

`.github/workflows/pages.yml` runs on every push to `main` (or by hand from the Actions tab). It:

1. installs with `npm ci` and checks the card decks (`npm run content:lint`),
2. removes the parts that need a server: `src/app/api` (Claude Appraiser), `auth` and `studio` (login, Studio),
   `jam` (Jam rooms), `wall` (Pitch Wall) and `play` (old street),
3. builds plain static files with `STATIC_EXPORT=1`, using the base path and address GitHub reports for this repo
   (so links, share links and QR codes always match where it's served),
4. publishes the `out/` folder to Pages.

## One-time setup on GitHub

1. Rename the repo to **`scrapbook`** (Settings → General → Repository name) for `quacklebit.com/scrapbook`.
   Keeping the current name serves it at `quacklebit.com/quackle.scrapbook` instead.
2. Settings → Pages → Build and deployment → **Source: GitHub Actions**. No custom domain is needed here: it inherits
   quacklebit.com from the account's Pages site.
3. Push `main`. The Actions tab shows the deploy; it's live a minute or two after it finishes.

## Local development

```bash
npm ci
npm run dev
```

Checks before pushing: `npm run typecheck && npm run lint && npm run content:lint && npm run build`.

To try the Pages build locally: `STATIC_EXPORT=1 NEXT_PUBLIC_BASE_PATH=/scrapbook npx next build` after removing the
server-only folders listed above (the workflow does that on GitHub; don't commit the removal).

## What's ignored

`.gitignore` keeps these out of the repo: `node_modules/`, `.next/`, `out/`, `next-env.d.ts`, `*.tsbuildinfo`, `.env*`
(except `.env.example`), `.vercel`, `*.pem`, `.DS_Store`, logs. Never commit a real `.env.local`; the Pages site needs
no keys at all.
