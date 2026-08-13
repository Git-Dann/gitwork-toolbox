# Pasteable prompt for Claude Cowork

The repo carries a skill at `.claude/skills/toolbox-add/SKILL.md`, so in a Cowork or
Claude Code session on this repository you can just say:

> add https://example.com to the toolbox

or `/toolbox-add https://example.com`, and it will fetch, assess, write, validate,
commit and push.

If you are in a session that has not picked the skill up, paste this instead. It is
the same instruction set, compressed.

---

You are adding entries to the Gitwork Toolbox (this repo). Entries live in
`data/additions.json`; `npm run data` compiles and validates them; the commit deploys.

For each link I give you:

1. Run `date -u +%Y-%m-%dT%H:%M:%S.000Z` and use it as `addedAt` for the whole batch.
2. Open the page and read it properly — what it does, what it costs, the licence, who
   is behind it, how mature it is. Check the pricing page and the repo if there is one.
   If you cannot open it, stop and tell me; do not fill fields from assumption.
3. Append an entry to `entries` in `data/additions.json`:
   - `kind`: `tool` (software we'd use), `resource` (something we read), or `starter`
     (a prompt/skill/kit with prompt text)
   - tools need: `name`, `website`, `what`, `category` (`Area / specific` form),
     `pricing` (`Free` | `Freemium` | `Paid`), `priceDetail` with real figures,
     `usefulness` (`High` | `Medium` | `Low` | `None` | `Unknown`) meaning useful *to a
     UK design-and-build studio doing client work*, `buildVerdict`
     (`Don't build - just use it` | `Weekend build` | `Small project (1-2 weeks)` |
     `Serious product (1-3 months)` | `N/A`), and `notes` as 1–3 paragraphs: why it
     matters to us, whether we could build it, what to watch out for
   - resources need: `name`, `link`, `resourceType`, `category`, `takeaway`,
     `whatToDo` (a real next action), `cost`, `usefulness`
   - starters need: `name`, `type` (`PROMPT` | `SKILL` | `KIT` | `COLLECTION` |
     `PLUGIN`), `summary`, `promptText` verbatim, plus `whatYouGet` and `install`
   - always `addedAt` and `addedBy` (my name)
4. Do **not** set `recommended` or `approved` unless I tell you to — those are set by
   hand in `/admin`.
5. Run `npm run data` to validate, then `npm run build`.
6. Commit `data/additions.json` with a message naming what you added, and push.
7. Tell me what you added, what you skipped and why, and anything unverifiable.

House voice: concrete, mechanism first, real figures, name the risk plainly (single
maintainer, no licence, alpha, IP concerns on client work), British spelling, no
marketing filler. Read a few existing entries in `src/data/generated/tools.json` first
and match them.

Never add a private page, billing or account page, or a client/prospect site — those
belong in the CRM or a password manager. Skip duplicates: check the existing entries
by name and domain, and offer to update instead.
