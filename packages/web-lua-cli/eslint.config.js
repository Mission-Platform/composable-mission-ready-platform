import base from '@mission-platform/eslint-config';

export default [
  ...base,
  {
    files: ['src/**/*.ts'],
    ignores: ['src/**/*.spec.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.build.json',
        projectService: false,
      },
    },
  },
  {
    files: ['src/**/*.spec.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        projectService: false,
      },
    },
  },
  {
    files: ['src/args.ts', 'src/args.spec.ts', 'src/main.ts'],
    rules: {
      // CLI argument names and the public parser export are compatibility API.
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/no-useless-undefined': 'off',
    },
  },
  {
    files: ['src/main.spec.ts', 'src/suite.spec.ts'],
    rules: {
      // These assertions verify the complete optional callback/adapter contract.
      'unicorn/no-useless-undefined': 'off',
      'unicorn/consistent-function-scoping': 'off',
    },
  },
];