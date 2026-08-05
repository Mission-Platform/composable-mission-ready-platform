import baseConfig from '@mission-platform/eslint-config';

export default [
  ...baseConfig,
  {
    // Generated wasm-pack bindings — not linted.
    ignores: ['src/wasm/**', 'dist/**'],
  },
];
