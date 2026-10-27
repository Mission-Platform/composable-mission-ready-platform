import baseConfig from '@mission-platform/eslint-config';

export default [
  ...baseConfig,
  {
    name: 'theme/stories',
    files: ['**/*.stories.tsx'],
    rules: {
      'unicorn/consistent-function-scoping': 'off',
    },
  },
];
