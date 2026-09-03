import baseConfig from '@mission-platform/eslint-config';

export default [
  ...baseConfig,
  {
    files: ['src/components/organisms/forge-three-canvas/forge-three-canvas.stories.tsx'],
    rules: {
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type'],
          'newlines-between': 'always',
          pathGroups: [{ pattern: '@mission-platform/**', group: 'external' }],
          pathGroupsExcludedImportTypes: ['builtin'],
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },
];
