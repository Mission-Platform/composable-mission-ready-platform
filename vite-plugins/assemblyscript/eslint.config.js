import baseConfig from '@mission-platform/eslint-config';

export default [
  { ignores: ['dist/**'] },
  ...baseConfig,
  {
    files: ['src/**/*.ts'],
    rules: {
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/import-style': 'off',
      'unicorn/no-await-expression-member': 'off',
      'unicorn/no-null': 'off',
    },
  },
];
