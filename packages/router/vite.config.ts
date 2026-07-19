import { defineLibraryConfig } from '@mission-platform/vite-config';

export default defineLibraryConfig({
  rootDir: __dirname,
  name: 'MissionPlatformRouter',
  // Multiple entries so each framework adapter (Vue, RedwoodSDK) is emitted as
  // its own subpath module alongside the framework-neutral root entry.
  entry: {
    index: 'src/index.ts',
    vue: 'src/vue.ts',
    redwood: 'src/redwood.ts',
  },
});
