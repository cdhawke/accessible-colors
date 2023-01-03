import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';
import external from 'rollup-plugin-peer-deps-external';
import dts from 'rollup-plugin-dts';
import * as packageJson from './package.json';

const banner = `
  /**
   * @license
   * author: ${packageJson.author}
   * ${packageJson.name.replace(/^@.*\//, '')}.js v${packageJson.version}
   * Released under the ${packageJson.license} license.
   */
`;

const production = !!process.env.PRODUCTION;

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: packageJson.main,
        format: 'cjs',
        sourcemap: production,
        name: 'accessible-colors',
        banner,
        exports: 'named',
      },
      {
        file: packageJson.module,
        format: 'esm',
        banner,
        sourcemap: production,
      },
    ],
    plugins: [
      external(),
      resolve(),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        sourceMap: production,
      }),
      process.env.PRODUCTION && terser(),
    ],
  },
  {
    input: 'dist/esm/types/index.d.ts',
    output: [{ file: 'dist/index.d.ts', format: 'esm' }],
    plugins: [dts()],
  },
];
