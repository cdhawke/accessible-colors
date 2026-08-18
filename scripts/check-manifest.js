#!/usr/bin/env node
/**
 * Published tarball manifest check.
 *
 * v1.0.9 declared `"bin": "scripts/bin.js"` for a file that did not exist in
 * the repository and was excluded from the tarball by `files` regardless. npm
 * happily published it, creating a bin entry pointing at nothing. Nothing in
 * the pipeline noticed.
 *
 * This asserts the tarball contains exactly what we expect, so that class of
 * drift fails the build instead of reaching the registry.
 */
const { execFileSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const { join } = require('node:path');

const EXPECTED = [
  'LICENSE',
  'README.md',
  'dist/index.d.mts',
  'dist/index.d.ts',
  'dist/index.js',
  'dist/index.js.map',
  'dist/index.mjs',
  'dist/index.mjs.map',
  'package.json',
];

const root = join(__dirname, '..');
const pkg = require(join(root, 'package.json'));

const output = execFileSync('npm', ['pack', '--dry-run', '--json'], {
  cwd: root,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'ignore'],
});
const [result] = JSON.parse(output);
const actual = result.files.map((f) => f.path).sort();

let failed = false;

const missing = EXPECTED.filter((f) => !actual.includes(f));
const unexpected = actual.filter((f) => !EXPECTED.includes(f));

if (missing.length) {
  console.error(`✗ missing from tarball: ${missing.join(', ')}`);
  failed = true;
}
if (unexpected.length) {
  console.error(
    `✗ unexpected in tarball: ${unexpected.join(', ')}\n` +
      `  If intentional, add them to EXPECTED in scripts/check-manifest.js.`
  );
  failed = true;
}

// Every declared executable must actually be published, and exist on disk.
const bin =
  typeof pkg.bin === 'string' ? { [pkg.name]: pkg.bin } : (pkg.bin ?? {});
for (const [name, path] of Object.entries(bin)) {
  const normalized = path.replace(/^\.\//, '');
  if (!existsSync(join(root, normalized))) {
    console.error(`✗ bin "${name}" -> ${path} does not exist on disk`);
    failed = true;
  } else if (!actual.includes(normalized)) {
    console.error(`✗ bin "${name}" -> ${path} is not included in the tarball`);
    failed = true;
  }
}

if (!failed) {
  console.log(
    `✓ manifest  ${actual.length} files, ${result.size} B packed, ` +
      `${result.unpackedSize} B unpacked`
  );
}

process.exit(failed ? 1 : 0);
