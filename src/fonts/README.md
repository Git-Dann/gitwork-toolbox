# Fonts for the share cards

Static TTF cuts of the three faces the site already uses, vendored because Satori — the
layout engine behind `next/og` — takes font data, not a stylesheet, and does not read
woff2. The site itself still loads these from Google Fonts in the browser; these copies
exist only to render `/api/og`.

| File | Face | Licence |
| --- | --- | --- |
| `playfair-700.ttf` | Playfair Display Bold | SIL Open Font License 1.1 |
| `jetbrains-mono-500.ttf` | JetBrains Mono Medium | SIL Open Font License 1.1 |
| `inter-400.ttf` / `inter-600.ttf` | Inter Regular / SemiBold | SIL Open Font License 1.1 |

All four are the Latin subsets Google serves, fetched from `fonts.gstatic.com`. Replacing
a face means replacing the file and the name in `src/app/api/og/route.tsx`.
