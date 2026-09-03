import baseConfig from '@mission-platform/eslint-config';

export default [
  ...baseConfig,
  {
    // Storybook CSF `render` functions return an inline `setup() { return () => h(...) }`
    // render closure that the Storybook API requires to live inside `setup`; it cannot be
    // hoisted, so the generic "move to outer scope" heuristic is a false positive here.
    name: 'typography/stories',
    files: ['**/*.stories.tsx'],
    rules: {
      'unicorn/consistent-function-scoping': 'off',
    },
  },
];
