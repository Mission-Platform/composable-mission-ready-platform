import baseConfig from '@mission-platform/eslint-config';

export default [
  ...baseConfig,
  {
    ignores: ['worker-configuration.d.ts'],
  },
  {
    files: ['src/**/*.ts', 'src/**/*.tsx', 'vite.config.ts'],
    rules: {
      'unicorn/filename-case': 'off',
      'unicorn/no-null': 'off',
      'unicorn/no-await-expression-member': 'off',
      'unicorn/no-array-callback-reference': 'off',
      'unicorn/no-array-reduce': 'off',
      'unicorn/prevent-abbreviations': 'off',
    },
  },
];
