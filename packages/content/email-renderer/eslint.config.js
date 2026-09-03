import baseConfig from '@mission-platform/eslint-config';

export default [
  ...baseConfig,
  {
    name: 'email-renderer/overrides',
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    rules: {
      'unicorn/no-empty-file': 'off',
    },
  },
];
