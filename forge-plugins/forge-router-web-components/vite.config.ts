import { defineLibraryConfig } from '@mission-platform/vite-config';

export default defineLibraryConfig({
  rootDir: __dirname,
  name: 'MissionPlatformForgeRouterWebComponents',
  entry: {
    index: 'src/index.ts',
    'runtime/index': 'src/runtime/index.ts',
  },
});
