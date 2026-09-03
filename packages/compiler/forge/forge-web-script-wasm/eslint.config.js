import base from '@mission-platform/eslint-config';

export default [
  ...base,
  {
    files: ['src/**/*.spec.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.test.json',
        projectService: false,
      },
    },
  },
  {
    files: ['src/emitter.ts', 'src/optimizer.ts', 'src/regex-runtime.ts'],
    rules: {
      // These modules construct ordered bytecode and capture arrays incrementally;
      // batching pushes would obscure the control flow and increase allocations.
      'unicorn/prefer-single-call': 'off',
      'unicorn/no-immediate-mutation': 'off',
    },
  },
];
