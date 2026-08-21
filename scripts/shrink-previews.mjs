import { existsSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

/**
 * Card previews arrive as whatever og:image a site publishes — often 2400px and over a
 * megabyte, for a card that renders about 380px wide. This re-encodes each one to a
 * sensible width in WebP, once, and deletes the original.
 *
 * It is not only about weight. Serving them at their natural size means they can be
 * marked unoptimized, so the site does not spend a Vercel image transformation per image
 * per breakpoint — with 230 previews that quota goes in a single browse.
 */
const DIR = join(process.cwd(), "public", "previews");
const WIDTH = 1000;
const QUALITY = 78;

if (!existsSync(DIR)) {
  console.log("previews: nothing to shrink");
  process.exit(0);
}

let converted = 0;
let skipped = 0;
let before = 0;
let after = 0;

for (const file of readdirSync(DIR)) {
  const source = join(DIR, file);
  if (!/\.(png|jpe?g|webp)$/i.test(file)) continue;
  const size = statSync(source).size;
  const meta = await sharp(source).metadata();

  // Already small enough and already WebP: leave it alone so the script can be re-run.
  if (file.endsWith(".webp") && (meta.width ?? 0) <= WIDTH) {
    skipped += 1;
    before += size;
    after += size;
    continue;
  }

  const target = join(DIR, `${file.replace(/\.(png|jpe?g|webp)$/i, "")}.webp`);
  const buffer = await sharp(source)
    .resize({ width: Math.min(WIDTH, meta.width ?? WIDTH), withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toBuffer();
  // Write after the read completes: source and target can be the same file.
  const { writeFileSync } = await import("node:fs");
  writeFileSync(target, buffer);
  if (target !== source) unlinkSync(source);
  converted += 1;
  before += size;
  after += buffer.length;
}

const mb = (n) => `${(n / 1024 / 1024).toFixed(1)}MB`;
console.log(
  `previews: ${converted} re-encoded, ${skipped} already small — ${mb(before)} → ${mb(after)}`,
);
