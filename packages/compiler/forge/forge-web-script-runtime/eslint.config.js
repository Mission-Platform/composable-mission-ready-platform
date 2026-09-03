import base from '@mission-platform/eslint-config';

export default [
  ...base,
  {
    files: ['src/vm-wasm.ts'],
    rules: {
      // WASM sections are assembled in order; individual pushes make the binary layout auditable.
      'unicorn/prefer-single-call': 'off',
      'unicorn/no-immediate-mutation': 'off',
    },
  },
];
