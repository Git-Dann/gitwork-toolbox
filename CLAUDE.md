# Working on the Gitwork Toolbox

## When Dan shares a screenshot, a URL, or a pile of either

Treat it as an audit-and-file job, not a paste job. He finds tools constantly and this
site is where they land, so the standing instruction is: **audit, organise, add.**

1. **Read the image properly.** Pull out every product name and URL in it, including ones
   in a caption, a byline or a link preview. A screenshot of a feed usually holds two or
   three worth having, not one.
2. **Resolve what is truncated or wrong.** Reddit and X cut URLs off mid-path. Test
   candidate names against the real thing rather than guessing — `git ls-remote` for a
   repo, a plain fetch for a site. `github.com/s1dashu/ip-as-…` was `ip-as-logo-skill`,
   found by testing three candidates.
3. **Chase demos to the product.** A screenshot often links a demo page, not the tool.
   `sticky.ui8.dev` served Forge's own metadata — the listing belongs to Forge, with the
   demo mentioned inside it, not a second thin row for a page nobody could read.
4. **Read every one before writing a word.** Open the site, check the pricing page, check
   the repo's licence and last push. If it cannot be read — bot check, login wall, dead —
   say so and do not write it up from assumption.
5. **File it into the existing scheme.** Reuse a category from
   `src/data/generated/meta.json`; only add one to `GROUPS` in `scripts/build-data.mjs`
   when nothing fits. Compound `Area / specific` form.
6. **Report the whole outcome**: what went in, what was skipped and why, and anything that
   could not be verified. Skipping quietly is the failure mode.

Overlap is not a reason to skip something. Several good options in a category is the
point — the boys need choices. The bar is whether a thing is good, not whether it is new
to the list.

## The rules that do not bend

- **Nothing gets listed that nobody read.** The workbook shipped with 684 unassessed
  directory rows; auditing them found products acquired, pivoted or shut down while still
  described as live. That is why the reading step exists.
- **Never set `recommended` or `approved`.** Those are Dan and Harry's calls, made in
  `/admin`. Adding something is not endorsing it.
- **Never add** a private page, a billing or account page, or a client or prospect site.
- **Real figures or none.** Quote what the pricing page actually served. If it publishes
  nothing, write that it publishes nothing.
- **British spelling**, and the house voice in `.claude/skills/toolbox-add/SKILL.md` —
  mechanism first, name the risk, no filler.

## Where things live

| Path | What it is |
| --- | --- |
| `data/additions.json` | Every entry added since the workbook. Append, never rewrite. |
| `data/proposals.json` | The discovery queue's findings. Rendered only in `/admin`. |
| `data/overrides.json` | Recommended / approved flags, set in the portal. |
| `scripts/discover.mjs` | Pipe 2 — sweeps the sources into a ranked queue. |
| `scripts/assess.mjs` | Pipe 3 — reads each candidate into `proposals.json`. |
| `scripts/build-design-md.mjs` | Indexes the 200-app DESIGN.md library. |
| `.claude/skills/toolbox-add/` | The schema, the house voice, the editorial rules. |
| `src/experiments/` + `src/components/experiments/` | The experiments room at `/experiments`. |

`npm run data` is the validator and runs as the first half of `npm run build`, so a
malformed entry cannot reach the site. After adding entries, run `npm run icons` and
`npm run previews` so the new cards have artwork.

## The experiments room

`/experiments` is an easter egg. The only way to it is the footer copyright year: click or
hold it from 2026 to 2100 and the link appears, kept in `localStorage`. Do not link it from
the nav, the footer columns or a collection — unlocking it is the point.

Adding one is a single entry in `src/components/experiments/registry.tsx`; the accordion
picks it up. Anything with an animation loop needs a `prefers-reduced-motion` path that
still draws a full frame, and needs redrawing on resize, because setting `canvas.width`
blanks it.

## Verify before saying it works

This site has had bugs shipped by assumption: a dedupe that silently discarded 410
candidates, a search index the build overwrote, dropdowns clipping their own labels. Run
the build, and check the actual behaviour in a browser at 375 and 1440 before reporting
done.
