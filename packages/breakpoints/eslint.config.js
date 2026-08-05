import baseConfig from '@mission-platform/eslint-config';

export default [
  ...baseConfig,
  {
    name: 'mission-platform/breakpoints-overrides',
    files: ['src/**/*.ts', 'src/**/*.tsx', 'vite.config.ts', 'vitest.config.ts'],
    rules: {
      'unicorn/no-null': 'off',
      'unicorn/no-array-reverse': 'off',
      // Storybook CSF uses the canonical `StoryObj` type name.
      'unicorn/prevent-abbreviations': 'off',
    },
  },
];
