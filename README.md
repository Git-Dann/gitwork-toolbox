# Gitwork Toolbox

A tool-discovery site for the studio: the AI tools list, the Foundry starter library
(prompts, skills, kits, plugins, collections) and the non-tool resources, in one
browsable place with Gitwork's own verdict attached where there is one.

No logins, no accounts, no favourites. Everything is static.

- **702 tools** across Free / Freemium / Paid, in 10 areas and 50 categories
- **224 Foundry starters** with the full prompt text and a copy button
- **20 resources** — articles, docs, accounts to follow, other people's directories
- **The shortlist** — what to buy, read, build, follow and park

## Stack

Next.js 15 (App Router, static export of 957 pages), React 19, Tailwind CSS v4,
TypeScript. Deployed on Vercel. No database and no runtime data fetching: the two
source files are committed and compiled into typed JSON at build time.

## Data pipeline

```
data/source/ai-tools-and-links.xlsx   the workbook, exported from Google Sheets
        │  python3 scripts/extract-workbook.py   (stdlib only)
        ▼
data/source/workbook-sheets.json      raw rows, one array per tab
data/source/foundry-starters.json     Foundry Starters export, as downloaded
        │  npm run data   (scripts/build-data.mjs)
        ▼
src/data/generated/*.json             tools, resources, starters, meta, shortlist
public/search-index.json              the ⌘K index, fetched on first open
```

`npm run build` runs `npm run data` first, so a deploy can never ship stale data.

### Updating the content

1. Re-export the Google Sheet as `.xlsx` over `data/source/ai-tools-and-links.xlsx`
2. `python3 scripts/extract-workbook.py`
3. Drop a fresh Foundry export over `data/source/foundry-starters.json`
4. `npm run data` and commit the regenerated files

Counts, categories, collections, filter facets and the about page all derive from
those two files — nothing is hardcoded in the pages.

Category names differ between the two sources (the directory uses tidy single words,
our own rows use compound ones like `Design engineering / motion`), so both are folded
into ten areas by the `GROUPS` table in `scripts/build-data.mjs`. A category that
matches no entry falls through a keyword matcher and logs a warning at build time.

## Local development

```bash
npm install
npm run data      # first run only, or after changing a source file
npm run dev       # http://localhost:3000
npm run typecheck
npm run build
```

## What is deliberately left out

- Three rows on the workbook's Resources tab: a private billing page, a private
  Notion page, and a live client site that belongs in the CRM. They are filtered
  out in `scripts/build-data.mjs`, not just hidden in the UI.
- Search-engine indexing. The site carries `noindex` plus a `robots.txt` disallow
  because the verdicts are written for internal use — see `src/app/robots.ts` and
  the `robots` key in `src/app/layout.tsx` to change that.
