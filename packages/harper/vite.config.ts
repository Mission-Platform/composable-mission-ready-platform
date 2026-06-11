import { defineLibraryConfig } from '@mission-platform/vite-config';

export default defineLibraryConfig({
  rootDir: __dirname,
  entry: {
    index: 'src/index.ts',
    'harper.worker': 'src/worker/harper.worker.ts',
  },
  name: 'MissionPlatformHarper',
  external: ['monaco-editor'],
  // Bundle each entry (incl. the worker) into a single self-contained file.
  preserveModules: false,
});
