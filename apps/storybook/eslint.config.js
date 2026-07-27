import baseConfig from '@mission-platform/eslint-config';

export default [
  ...baseConfig,
  {
    files: ['src/**/*.ts', 'src/**/*.tsx', 'vite.config.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'unicorn/prevent-abbreviations': 'off',
    },
  },
];
