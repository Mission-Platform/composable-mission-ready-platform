import { defineTsdownLibrary } from '@mission-platform/tsdown-config';

/**
 * Self-contained ESM bundles for the main entry and the Harper worker.
 *
 * The worker imports `harper.js/binaryInlined` (base64 data-URI WASM) so the
 * bundle stays self-contained without a separate `*.wasm` asset — matching the
 * prior Vite build's `assetsInlineLimit` contract. `vue` is externalised by
 * default; `monaco-editor` is type-only / lazy-imported by consumers.
 */
export default defineTsdownLibrary({
  rootDir: import.meta.dirname,
  entry: {
    index: 'src/index.ts',
    'harper.worker': 'src/worker/harper.worker.ts',
  },
  // Single self-contained file per entry (worker must carry inlined wasm).
  unbundle: false,
  clean: true,
  external: ['monaco-editor'],
  overrides: {
    // tsdown externalises package.json `dependencies` by default; force-bundle
    // harper.js (and its inlined WASM binary) into the worker the same way Vite did.
    deps: {
      // Match the package root and all subpath exports (e.g. binaryInlined).
      alwaysBundle: [/^harper\.js(?:\/|$)/],
    },
  },
});
