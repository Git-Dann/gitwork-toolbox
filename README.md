# Gitwork Toolbox

A tool-discovery site for the studio, in Gitwork's own branding: the tools we have
actually assessed, the Foundry starter library, and the resources worth reading —
each with our verdict attached, plus an admin portal for flagging what we
recommend.

No logins, accounts or favourites on the public side. Everything is static.

- **18 tools** we fetched and read individually, with price, verdict and watch-outs
- **10 recommended, 22 approved** out of the box, seeded from the workbook verdicts
- **224 Foundry starters** with the full prompt text and a copy button
- **20 resources** — articles, docs, accounts to follow, other people's directories
- **The shortlist** — what to buy, read, build, follow and park
- **Admin portal** at `/admin` for Dan and Harry to mark items Recommended or
  Gitwork approved and add a studio note

## Design

Dark by default, taken from Gitwork's report covers: `#0C0C18` ground, `#6B52FF`
violet accent, heavy serif display with the accented full stop, mono micro-labels,
violet arrow bullets. The light theme is the paper interior of the same document
(`#F2EDE4`) and is available from the sidebar toggle. Navigation is a persistent
left rail with counts, so content gets the full width.

## Stack

Next.js 16 (App Router), React 19, Tailwind CSS v4, TypeScript. Deployed on Vercel.
No database: the sources are committed and compiled into typed JSON at build time.
The only server-side surfaces are the three admin routes.

## Data pipeline

```
data/source/ai-tools-and-links.xlsx   the workbook, exported from Google Sheets
        │  python3 scripts/extract-workbook.py   (stdlib only)
        ▼
data/source/workbook-sheets.json      raw rows, one array per tab
data/source/foundry-starters.json     Foundry Starters export, as downloaded
data/overrides.json                   flags set in the admin portal
data/additions.json                   entries posted since, via /toolbox-add
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

Counts, areas, collections, filter facets and the about page all derive from those
files — nothing is hardcoded in the pages.

Our categories are compound (`Design engineering / motion`), so they fold into
areas via the `GROUPS` table in `scripts/build-data.mjs`. A category matching no
entry falls through a keyword matcher and logs a warning at build time.

## Adding entries

The site has no CMS. New entries go into `data/additions.json`, get compiled by
`npm run data`, and go live when the commit deploys.

In a Cowork or Claude Code session on this repo, paste a link and say what you want:

```
add https://example.com to the toolbox
/toolbox-add https://a.com https://b.com
```

The `.claude/skills/toolbox-add` skill takes it from there: it opens the page, writes
the entry in the house voice, validates, commits and pushes. `docs/cowork-add-prompt.md`
has the same instructions as a pasteable prompt for sessions that have not picked the
skill up. The schema and the editorial rules live in the skill file — that is the one
place to change how entries get written.

`npm run data` is the validator. It fails the build on a missing field, a bad enum, an
unparseable URL or a missing timestamp, so a malformed entry cannot reach the site.

### Newly added

Only entries in `data/additions.json` carry an `addedAt`, so the "Newly added" section
— the home rail, the `/new` page and the sidebar link — appears only once something has
been posted, and `/new` 404s until then. Anything added in the last 30 days also wears
a small `New` mark on its card.

## Admin portal

`/admin` lets Dan and Harry flag items. Because the site is statically generated
with no database, flags are stored in `data/overrides.json` and committed through
the GitHub API — so every change is versioned, attributed, and picked up by the
deploy its own commit triggers. Expect roughly a minute between publishing and the
badges appearing.

Environment variables (Vercel → Project → Settings → Environment Variables):

| Variable | Required | What it does |
| --- | --- | --- |
| `ADMIN_PASSWORD` | yes | The shared password. That is the whole sign-in. |
| `GITHUB_TOKEN` | yes | Fine-grained PAT with **Contents: Read and write** on this repository only. Lets the portal commit flags. |
| `GITHUB_REPO` / `GITHUB_BRANCH` | no | Override the commit target. Defaults to Vercel's own `VERCEL_GIT_*` values. |

One password, a signed HTTP-only cookie for seven days, no user accounts.
`Recommended` means we would actively reach for it; `Gitwork approved` means it has
been checked over and cleared for client work. Both are set by hand — never
inferred from the data. The seeded set in `data/overrides.json` came from the
workbook's own High ratings and the "worth money this week" shortlist.

## Local development

```bash
npm install
npm run data      # first run only, or after changing a source file
npm run dev       # http://localhost:3000
npm run typecheck
npm run build
```

For the portal locally: `ADMIN_PASSWORD=whatever npm run dev`. Publishing needs
`GITHUB_TOKEN` and `GITHUB_REPO` too, otherwise the save fails with a clear message.

## What is deliberately left out

- **The 684-tool 700 AI Toolkit import.** Dropped in the build script. Unread
  listings carrying someone else's unverified pricing labels are noise.
- **Three rows from the workbook's Resources tab**: a private billing page, a
  private Notion page, and a live client site that belongs in the CRM. Filtered out
  in `scripts/build-data.mjs`, not merely hidden in the UI.
- **Search-engine indexing.** `noindex` plus a `robots.txt` disallow, because the
  verdicts are written for internal use — see `src/app/robots.ts` and the `robots`
  key in `src/app/layout.tsx`.
