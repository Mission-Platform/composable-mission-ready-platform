import baseConfig from '@mission-platform/eslint-config';

export default [
  ...baseConfig,
  {
    files: ['src/son-ir.ts'],
    rules: {
      // SoN traversal is intentionally recursive and preserves mutable annotations while walking the IR.
      'unicorn/no-array-callback-reference': 'off',
      'unicorn/no-array-for-each': 'off',
      'unicorn/consistent-function-scoping': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['src/lexer.ts'],
    rules: {
      // Lexer predicates operate on UTF-16 code units by design.
      'unicorn/prefer-code-point': 'off',
    },
  },
  {
    files: ['src/self-hosted/stage-codec.ts', 'src/compiler-artifact-verification.spec.ts'],
    rules: {
      // Dynamic imports are required for the stage codec and Vitest module mock.
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
  {
    files: ['src/ir.ts'],
    rules: {
      // The allocator default is a fresh mutable state per lowering operation.
      'unicorn/no-object-as-default-parameter': 'off',
    },
  },
  {
    files: ['src/compiler.spec.ts'],
    rules: {
      // The fixture mirrors i32 wrapping in the backend.
      'unicorn/prefer-math-trunc': 'off',
    },
  },
];
