import baseConfig from '@mission-platform/eslint-config';

export default [
  ...baseConfig,
  {
    files: ['e2e/**/*.ts', 'playwright.config.ts'],
    languageOptions: {
      parserOptions: {
        project: false,
        projectService: false,
      },
    },
  },
];
