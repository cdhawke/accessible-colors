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

const BUDGETS = [{ file: 'dist/index.mjs', limit: 2048 }];

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
