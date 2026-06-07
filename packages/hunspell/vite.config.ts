import { defineLibraryConfig } from '@mission-platform/vite-config';

export default defineLibraryConfig({
  rootDir: __dirname,
  entry: {
    hunspell: 'src/index.ts',
    'hunspell.worker': 'src/hunspell.worker.ts',
  },
  name: 'MissionPlatformHunspell',
  overrides: {
    assetsInclude: ['**/*.wasm'],
    build: {
      rollupOptions: {
        output: {
          assetFileNames: 'assets/[name][extname]',
        },
      },
    },
  },
});
