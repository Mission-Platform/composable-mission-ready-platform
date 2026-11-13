import baseConfig from '@mission-platform/eslint-config';

export default [
  ...baseConfig,
  {
    name: 'mission-platform/wasm-bridge-overrides',
    files: ['src/**/*.ts', 'vite.config.ts', 'vitest.config.ts'],
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
