import baseConfig from '@mission-platform/eslint-config';

export default [
  ...baseConfig,
  {
    name: 'mission-platform/scripts',
    files: ['**/*.ts', '**/*.js'],
    rules: {
      // CLI tooling scripts may use process.exit and short conventional names
      // (dir, pkg, rel*) that are not appropriate to enforce here.
      'unicorn/no-process-exit': 'off',
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/import-style': 'off',
      'unicorn/text-encoding-identifier-case': 'off',
      'unicorn/no-array-sort': 'off',
    },
  },
];
