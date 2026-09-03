import baseConfig from '@mission-platform/eslint-config';

export default [
  ...baseConfig,
  {
    files: ['src/**/*.ts'],
    rules: {
      'import-x/no-useless-path-segments': 'off',
    },
  },
];
