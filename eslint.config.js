// @ts-check
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  {
    ignores: ['node_modules/**', 'dist/**', 'coverage/**', 'scripts/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      // Previously disabled to permit two @ts-ignore comments in helpers.ts
      // that suppressed a real "possibly undefined" error. Those are now fixed
      // by typing the code correctly, so the rule is back on — and if a
      // suppression is genuinely needed, @ts-expect-error with a description
      // makes it visible rather than silent.
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-check': false,
        },
      ],
    },
  },
  {
    files: ['src/**/__tests__/**/*.ts'],
    rules: {
      // Tests deliberately pass invalid input to assert it is rejected.
      '@typescript-eslint/no-explicit-any': 'off',
    },
  }
);
