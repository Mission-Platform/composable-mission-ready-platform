import baseConfig from '@mission-platform/eslint-config';

export default [
  ...baseConfig,
  {
    name: 'email-components/overrides',
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    rules: {
      'sonarjs/no-table-as-layout': 'off',
    },
  },
];
