import baseConfig from '@mission-platform/eslint-config';

export default [
  ...baseConfig,
  {
    name: 'float/stories',
    files: ['**/*.stories.tsx'],
    rules: {
      'unicorn/consistent-function-scoping': 'off',
    },
  },
];
