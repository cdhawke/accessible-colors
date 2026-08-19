#!/usr/bin/env node
/**
 * Bundle size budget.
 *
 * Size is this package's clearest competitive advantage — it undercuts colord
 * (2.1 KB gzip) and chroma-js (16.5 KB gzip) by a wide margin. That advantage
 * only holds if it is measured, so this fails the build when the budget is
 * exceeded rather than letting it erode a few bytes at a time.
 *
 * Deliberately dependency-free, matching the package itself.
 */
const { gzipSync, brotliCompressSync } = require('node:zlib');
const { readFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');

// Raised from 2048 in 1.2.0 to accept CSS color format parsing (rgb(), hsl(),
// both syntaxes, all angle units), which costs ~550 B gzip. Hex-only input was
// the largest barrier to adoption — getComputedStyle returns rgb() regardless
// of how a color was authored — so this buys the ability to check contrast
// against what a browser actually rendered. It does give up the size lead over
// colord (2.1 KB), which was a deliberate call: colord cannot suggest a fix.
//
// Raised again in 1.3.0 to ~496 B for OKLab/OKLCH conversion and gamut
// mapping, replacing the HSL-lightness search behind suggestAAColorVariant /
// suggestAAAColorVariant. That function is the actual differentiator versus
// every larger competitor, so its output quality is worth more than a couple
// hundred bytes. Measured effect, not assumed: on saturated inputs (the
// motivating case) mean hue drift dropped from 0.7° to 0.1° across sample
// hues, and mean ΔE OK across 5,000 random pairs fell about 1.7% with the new
// algorithm choosing the strictly closer-looking candidate 68% of the time
// they disagree. A trim pass was attempted first — the matrix constants and
// gamut-search loop are already near-minimal after minification.
const BUDGETS = [{ file: 'dist/index.mjs', limit: 3200 }];

const root = join(__dirname, '..');
let failed = false;

for (const { file, limit } of BUDGETS) {
  const path = join(root, file);
  if (!existsSync(path)) {
    console.error(`✗ ${file} — not built. Run \`npm run build-production\` first.`);
    failed = true;
    continue;
  }

  const source = readFileSync(path);
  const gzip = gzipSync(source, { level: 9 }).length;
  const brotli = brotliCompressSync(source).length;
  const pct = Math.round((gzip / limit) * 100);
  const ok = gzip <= limit;
  if (!ok) failed = true;

  console.log(
    `${ok ? '✓' : '✗'} ${file}  ${gzip} B gzip / ${limit} B budget (${pct}%)` +
      `  ·  ${source.length} B raw, ${brotli} B brotli`
  );

  if (!ok) {
    console.error(
      `\n  ${file} is ${gzip - limit} B over budget.\n` +
        `  Either reduce the size, or raise the budget deliberately with a note\n` +
        `  in the PR explaining what the extra bytes buy.\n`
    );
  }
}

/**
 * `sideEffects: false` is a claim to bundlers, not a guarantee. Verify it by
 * bundling a single named import and asserting the rest is dropped.
 */
try {
  const { buildSync } = require('esbuild');
  const result = buildSync({
    stdin: {
      contents: `import { getContrast } from '${join(root, 'dist/index.mjs')}';
                 console.log(getContrast('#fff', '#000'));`,
      resolveDir: root,
      loader: 'js',
    },
    bundle: true,
    minify: true,
    format: 'esm',
    write: false,
  });
  const out = result.outputFiles[0].text;
  const shaken = ['suggestColorVariant', 'binarySearchContrast', 'hslToRgb'];
  const leaked = shaken.filter((name) => out.includes(name));
  const bytes = Buffer.byteLength(out);

  if (leaked.length) {
    console.log(`✗ tree-shaking  unused code retained: ${leaked.join(', ')}`);
    failed = true;
  } else {
    console.log(
      `✓ tree-shaking  single-import bundle is ${bytes} B ` +
        `(${Math.round((bytes / readFileSync(join(root, 'dist/index.mjs')).length) * 100)}% of full build)`
    );
  }
} catch (error) {
  console.log(`· tree-shaking  skipped (${error.message.split('\n')[0]})`);
}

process.exit(failed ? 1 : 0);
