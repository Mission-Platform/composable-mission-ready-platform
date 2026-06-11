import { defineLibraryConfig } from '@mission-platform/vite-config';

export default defineLibraryConfig({
  rootDir: __dirname,
  entry: {
    hunspell: 'src/index.ts',
    'hunspell.worker': 'src/worker/hunspell.worker.ts',
  },
  name: 'MissionPlatformHunspell',
  external: ['monaco-editor'],
  // Bundle each entry (incl. the worker) into a single self-contained file
  // so the worker and its WASM assets stay co-located.
  preserveModules: false,
  overrides: {
    assetsInclude: ['**/*.wasm'],
    build: {
      rolldownOptions: {
        output: {
          assetFileNames: 'assets/[name][extname]',
        },
      },
    },
  },
});
