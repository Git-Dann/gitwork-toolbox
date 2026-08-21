---
name: toolbox-add
description: Add a tool, resource or Foundry starter to the Gitwork Toolbox. Use when someone pastes a URL or a batch of links and wants them on the site, says "add this to the toolbox", "put this on the toolbox", "new tool for the toolbox", or invokes /toolbox-add. Fetches and assesses the thing, writes the entry, validates, commits and pushes so Vercel redeploys.
---

# Add to the Gitwork Toolbox

The toolbox has no CMS. Entries live in `data/additions.json`, get compiled into the
site by `npm run data`, and go live when the commit deploys. Your job is to turn a
pasted link into a properly assessed entry and land it.

## What you are writing

Everything on this site was opened and read by a person before it was listed. That
is the whole point of it — the 684-row imported directory was deliberately deleted
because nobody had read those rows. So do not write a listing from a name and a
guess. **Open the page.** If you cannot open it, say so and stop; do not fill the
fields from what you assume the product does.

## When the input is a screenshot

Dan shares screenshots of Reddit, X and Instagram constantly. Extract every product name
and URL in the image — including ones in captions, bylines and link previews — then treat
each as a pasted link. Two specifics that come up every time:

- **Truncated URLs.** Feeds cut paths off. Test candidates against the real thing rather
  than guessing; `git ls-remote` settles a repo name in seconds.
- **Demo pages.** A post often links a demo, not the product. If a page serves another
  tool's metadata, the listing belongs to that tool, with the demo noted inside it.

## Steps

1. **Get the current timestamp.** Run `date -u +%Y-%m-%dT%H:%M:%S.000Z`. Use it for
   `addedAt` on every entry in this batch. Never invent a date.
2. **Fetch each URL** and read it properly — what it actually does, what it costs,
   what the licence is, who is behind it, how mature it looks. Check a pricing page
   and a repo if there is one. For a GitHub repo, look at commit recency, stars,
   releases and licence.
3. **Decide the kind:**
   - `tool` — software you would use or install
   - `resource` — an article, doc, social account, directory or repo you read rather
     than adopt
   - `starter` — a prompt, skill, kit, plugin or collection with prompt text to paste
4. **Write the entry** into `data/additions.json` under `entries`, using the schema
   below. Append; never rewrite existing entries.
5. **Validate:** `npm run data`. It fails loudly on a missing field, a bad enum, an
   unparseable URL or a bad timestamp. Fix and re-run until clean.
6. **Check it renders:** `npm run build` (or `npm run dev` and look at `/new`).
7. **Commit and push** on the current branch, one commit per batch:
   `git add data/additions.json && git commit -m "Add <names> to the toolbox" && git push`
8. **Report back**: what you added, what you deliberately left out, and anything you
   could not verify. Mention that the site rebuilds in about a minute.

## Schema

Common to all kinds: `kind`, `name`, `addedAt`, `addedBy` (who asked — "Dan" or
"Harry"), and optionally `slug` (derived from the name if omitted), `recommended`,
`approved`, `note`.

**Do not set `recommended` or `approved` unless you were explicitly told to.** Those
are Dan and Harry's calls, made in the admin portal at `/admin`. Adding something is
not endorsing it.

### tool

```json
{
  "kind": "tool",
  "name": "Transitions.dev",
  "website": "https://transitions.dev/",
  "what": "Copy-paste library of 36+ production-ready UI transitions in CSS and React, plus an agent skill that installs them into a project.",
  "category": "Design engineering / motion",
  "pricing": "Freemium",
  "priceDetail": "Free tier. Pro $9/mo solo or $149 one-time lifetime. Team $39/mo for 5 seats.",
  "usefulness": "High",
  "buildVerdict": "Don't build - just use it",
  "notes": [
    "Why it matters to us, concretely.",
    "Whether we could build it ourselves, and whether that is worth doing.",
    "What to watch out for — licence, maintenance, vendor risk, anything that would bite on client work."
  ],
  "addedAt": "2026-08-14T09:12:00.000Z",
  "addedBy": "Dan"
}
```

- `pricing` — exactly one of `Free`, `Freemium`, `Paid`. Judge it on whether there is
  a genuinely usable free tier or an open-source licence.
- `usefulness` — `High`, `Medium`, `Low`, `None`, `Unknown` or `Not assessed`. This is
  usefulness *to a UK design-and-build studio shipping client work*, not general
  quality. A brilliant consumer app is `Low` for us.
- `buildVerdict` — the house phrasing: `Don't build - just use it`, `Weekend build`,
  `Small project (1-2 weeks)`, `Serious product (1-3 months)`, or `N/A`.
- `category` — reuse an existing one where it fits (see `src/data/generated/meta.json`
  → `categories`). Compound `Area / specific` form. A new category still lands in an
  area via the keyword matcher, but check the build output for the "no explicit group"
  warning and add it to `GROUPS` in `scripts/build-data.mjs` if it belongs somewhere.
- `linkCheck` — optional; defaults to "Reviewed in detail". Use `Dead (404)`,
  `Not resolving`, `Blocked bot check (likely OK)` or `Payment required (402)` if that
  is what you got.

### resource

```json
{
  "kind": "resource",
  "name": "Steering Claude Code",
  "link": "https://claude.com/blog/...",
  "resourceType": "Article/blog post",
  "category": "AI coding / agency ops",
  "takeaway": "What it says, in one or two sentences — the actual content, not a summary of the headline.",
  "whatToDo": "Reference. Action: audit the .claude/ setup for Foundry and client repos.",
  "cost": "Free",
  "usefulness": "High",
  "notes": ["What to watch out for, or what could not be verified."],
  "addedAt": "2026-08-14T09:12:00.000Z",
  "addedBy": "Dan"
}
```

`resourceType` reuses the existing set: `Article/blog post`, `Docs & reference`,
`Social account`, `Directory`, `Open-source repo`, `GitHub issue`, `Newsletter/PDF`.
`whatToDo` must name a real next action, not "worth a read".

### starter

```json
{
  "kind": "starter",
  "name": "Launch Kit",
  "type": "KIT",
  "summary": "One line on what it does for you.",
  "description": "A **kit** — longer markdown description. Bold and `code` and dash lists render.",
  "promptText": "<role>\n…the full text, verbatim…\n</role>",
  "whatYouGet": ["Three or four concrete things", "…"],
  "install": ["Step one", "Step two"],
  "techStack": ["Node.js", "React"],
  "tags": ["scaffolding", "hooks"],
  "keywords": [],
  "addedAt": "2026-08-14T09:12:00.000Z",
  "addedBy": "Dan"
}
```

`type` is one of `PROMPT`, `SKILL`, `KIT`, `COLLECTION`, `PLUGIN`. `promptText` is the
whole thing, exactly as it should be pasted — that text is the product, so never
paraphrase or truncate it. Prefer pulling it from Foundry over retyping.

## House voice

Match the existing entries; read a few in `src/data/generated/tools.json` first.

- Concrete and specific. "Go CLI that abridges a code diff into a reading diff" beats
  "powerful developer productivity tool".
- Lead with the mechanism, not the marketing. If the name is misleading, say so
  outright — one existing entry opens "NOT a JavaScript motion library despite the
  name".
- Real figures. `$149 one-time (solo lifetime)`, not "affordable pricing". If pricing
  is unpublished, write that it is unpublished.
- Name the risk plainly: single maintainer, no licence, pre-revenue, alpha, no
  round-trip, IP concerns on client work.
- No filler openers, no "in today's fast-paced world", no rule-of-three padding.
- British spelling.

## Rules

- **Never add** a private page, a billing or account page, a client or prospect site,
  or anything that belongs in the CRM or a password manager. Three such rows were
  deliberately excluded from this site; do not reintroduce that class of link. If a
  pasted link is one of those, say why you skipped it.
- One commit per batch, and only touch `data/additions.json` unless a new category
  needs adding to the build script.
- **A duplicate is the same product, not a similar one.** If the exact thing is already
  listed (check `src/data/generated/tools.json` and the other generated files by name and
  by domain), say so and offer to update that entry instead of adding a second row.
  Something that overlaps an existing listing is not a duplicate — several good options in
  a category is the point, so judge it on whether it is good.
- If the page cannot be read — bot protection, login wall, dead link — do not guess.
  Report it and let the human paste the content.
