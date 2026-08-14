import baseConfig from '@mission-platform/eslint-config';

export default [
  ...baseConfig,
  {
    ignores: ['storybook-static-*/**', 'storybook-static/**'],
  },
  {
    files: ['src/**/*.ts', 'src/**/*.tsx', 'vite.config.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'unicorn/prevent-abbreviations': 'off',
    },
  },
];
