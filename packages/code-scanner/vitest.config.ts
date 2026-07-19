import { resolve } from 'node:path';

import { defineVitestConfig } from '@mission-platform/vite-config/vitest';

export default defineVitestConfig({
  coverageInclude: ['src/**/*.ts', 'src/**/*.tsx'],
  coverageExclude: [
    'src/**/*.spec.ts',
    'src/generated/**',
    'src/test-setup.ts',
    'src/test-support/**',
    'src/**/*.stories.*',
  ],
  overrides: {
    // The neutral `BaseCodeScanner` is authored in the `@mission-platform/jsx`
    // dialect (the classic `h` factory), so its spec is transformed with that
    // JSX factory rather than React's automatic runtime.
    esbuild: {
      jsxFactory: 'h',
      jsxFragment: 'Fragment',
    },
    resolve: {
      alias: [
        // The self-import the component uses for the scanner must resolve to the
        // same source module the setup file initialises (so the wasm singleton is
        // shared), not the built `dist/index.js`.
        { find: /^@mission-platform\/code-scanner$/, replacement: resolve(__dirname, 'src/index.ts') },
        // Load only the neutral primitives the component needs, not the whole
        // `@mission-platform/components` barrel (see the shim's own note).
        {
          find: /^@mission-platform\/components$/,
          replacement: resolve(__dirname, 'src/test-support/neutral-components.ts'),
        },
      ],
    },
    test: {
      // Instantiate the scanner wasm module once, before any spec, so the
      // synchronous `scanImageData` works under Vitest (binary isn't inlined).
      setupFiles: ['./src/test-setup.ts'],
      // The neutral `@mission-platform/icons` (used by the component) ships only
      // per-framework builds, so it must be inlined and transformed by Vite —
      // with the same `h` JSX factory — rather than externalised and loaded as
      // raw `.tsx` by Node.
      server: {
        deps: {
          inline: ['@mission-platform/icons'],
        },
      },
      // Render the unhashed BEM class names so the component's cross-framework
      // parity assertions read against the literal class names.
      css: {
        modules: {
          classNameStrategy: 'non-scoped',
        },
      },
    },
  },
});
