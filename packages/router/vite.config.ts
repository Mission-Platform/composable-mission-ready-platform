import { defineLibraryConfig } from '@mission-platform/vite-config';

export default defineLibraryConfig({
  rootDir: __dirname,
  name: 'MissionPlatformRouter',
  // Multiple entries so the framework adapter (Vue) is emitted as its own
  // subpath module alongside the framework-neutral root entry.
  entry: {
    index: 'src/index.ts',
    vue: 'src/vue.ts',
  },
});
