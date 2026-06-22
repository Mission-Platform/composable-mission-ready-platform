import baseConfig from '@mission-platform/eslint-config';

export default [
  ...baseConfig,
  {
    // Hand-authored ambient typings shipped as-is (not part of a tsconfig
    // program, and intentionally not type-checked by the project service).
    name: 'mission-platform/jsx-globals-ignore',
    ignores: ['jsx-globals.d.ts'],
  },
  {
    // The neutral hooks deliberately mirror React's public hook API
    // (`useRef`/`MpRef`, `…args`) so `@mission-platform/vite-plugin-jsx` can
    // re-export React's hooks verbatim; keep those exact names.
    name: 'mission-platform/jsx-hooks-names',
    files: ['src/runtime/hooks.ts'],
    rules: {
      'unicorn/prevent-abbreviations': 'off',
    },
  },
];
