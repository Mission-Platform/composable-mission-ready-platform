import baseConfig from '@mission-platform/eslint-config';

export default [
  ...baseConfig,
  {
    // The compiler and the per-framework generators deliberately mirror the
    // React/Vue/Storyblok public vocabulary they emit (`props`, `useRef`, `ref`,
    // `h`, the `null`-valued Storyblok component object, …) so the generated
    // sources line up exactly with each target's API; keep those verbatim.
    name: 'mission-platform/vite-plugin-jsx-generator-names',
    files: ['src/compiler/**/*.ts', 'src/generators/**/*.ts', 'src/generate.ts'],
    rules: {
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/no-null': 'off',
    },
  },
];
