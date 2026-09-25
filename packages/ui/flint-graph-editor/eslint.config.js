import baseConfig from '@mission-platform/eslint-config';

export default [
  ...baseConfig,
  {
    name: 'flint-graph-editor/rules',
    files: ['src/**/*.ts', 'src/**/*.vue'],
    rules: {
      '@typescript-eslint/prefer-satisfies': 'off',
      'unicorn/prevent-abbreviations': 'off',
    },
  },
];
