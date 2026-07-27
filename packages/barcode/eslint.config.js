import baseConfig from '@mission-platform/eslint-config';

export default [
  { ignores: ['rust/**', 'scripts/**', 'src/generated/**'] },
  ...baseConfig,
  {
    name: 'mission-platform/barcode-overrides',
    files: ['src/**/*.ts', 'src/**/*.tsx', 'vite.config.ts', 'vitest.config.ts'],
    rules: {
      'unicorn/no-null': 'off',
      'unicorn/prefer-code-point': 'off',
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/import-style': 'off',
      'unicorn/no-new-array': 'off',
      'unicorn/prefer-spread': 'off',
    },
  },
];
