import { defineLibraryConfig } from '@mission-platform/vite-config';

export default defineLibraryConfig({
  rootDir: __dirname,
  entry: {
    hunspell: 'src/index.ts',
    'hunspell.worker': 'src/worker/hunspell.worker.ts',
  },
  name: 'MissionPlatformHunspell',
  external: ['monaco-editor'],
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
