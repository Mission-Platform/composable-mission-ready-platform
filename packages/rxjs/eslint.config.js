import baseConfig from '@mission-platform/eslint-config';

export default [
  ...baseConfig,
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    rules: {
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
          pathGroups: [{ pattern: '@mission-platform/rxjs', group: 'external' }],
          pathGroupsExcludedImportTypes: [],
        },
      ],
    },
  },
];
