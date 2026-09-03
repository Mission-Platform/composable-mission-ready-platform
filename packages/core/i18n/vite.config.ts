import { defineLibraryConfig } from '@mission-platform/vite-config';

export default defineLibraryConfig({
  rootDir: __dirname,
  name: 'MissionPlatformI18n',
  // Multiple entries so the framework adapters (Vue / React) are emitted as
  // their own subpath modules alongside the framework-neutral root entry.
  entry: {
    index: 'src/index.ts',
    vue: 'src/vue.ts',
    react: 'src/react.ts',
  },
});
