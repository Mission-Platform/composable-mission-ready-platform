import baseConfig from '@mission-platform/eslint-config';

export default [
  ...baseConfig,
  {
    name: 'components/overrides',
    files: ['src/**/*.ts', 'src/**/*.tsx', 'vite.config.ts', 'vitest.config.ts'],
    rules: {
      'unicorn/consistent-function-scoping': 'off',
      'unicorn/prefer-default-parameters': 'off',
      'unicorn/prevent-abbreviations': 'off',
    },
  },
];
