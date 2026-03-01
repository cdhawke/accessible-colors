import { defineConfig } from 'tsup';
import packageJson from './package.json';

const banner = `/**
 * @license
 * author: ${packageJson.author}
 * ${packageJson.name}.js v${packageJson.version}
 * Released under the ${packageJson.license} license.
 */`;

const production = !!process.env.PRODUCTION;

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: production,
  minify: production,
  clean: true,
  banner: { js: banner },
});
