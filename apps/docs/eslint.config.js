import baseConfig from '@mission-platform/eslint-config';

export default [
  ...baseConfig,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.app.json',
        projectService: false,
      },
    },
    rules: {
      // Docs-prefixed element and route names are the app's public integration vocabulary.
      'unicorn/prevent-abbreviations': 'off',
    },
  },
  {
    files: ['scripts/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: false,
        projectService: false,
      },
    },
    rules: {
      'unicorn/prevent-abbreviations': 'off',
    },
  },
  {
    files: ['src/**/*.test.ts', 'src/**/*.integration.test.ts'],
    languageOptions: {
      parserOptions: {
        project: false,
        projectService: false,
      },
    },
  },
  {
    files: ['src/main.ts'],
    rules: {
      // Browser startup intentionally awaits the app bootstrap before mounting.
      'unicorn/prefer-top-level-await': 'off',
    },
  },
  {
    files: ['src/router.ts'],
    languageOptions: {
      parserOptions: {
        project: false,
        projectService: false,
      },
    },
  },
  {
    files: ['src/docs-app.integration.test.ts'],
    rules: {
      'unicorn/no-null': 'off',
    },
  },
];
