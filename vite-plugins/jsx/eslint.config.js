import baseConfig from '@mission-platform/eslint-config';

export default [
  ...baseConfig,
  {
    name: 'mission-platform/vite-plugin-jsx-generator-names',
    files: ['src/**/*.ts', 'src/**/*.tsx', 'vite.config.ts', 'vitest.config.ts'],
    rules: {
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/no-null': 'off',
      'unicorn/consistent-function-scoping': 'off',
      'unicorn/no-array-for-each': 'off',
      'unicorn/prefer-string-raw': 'off',
      'unicorn/no-array-sort': 'off',
      'unicorn/explicit-length-check': 'off',
      'unicorn/no-negated-condition': 'off',
      'unicorn/prefer-string-replace-all': 'off',
      'unicorn/prefer-single-call': 'off',
      'unicorn/prefer-spread': 'off',
      'unicorn/no-useless-undefined': 'off',
    },
  },
];
