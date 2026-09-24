import path from 'node:path';

import { forgeVueFramework } from '@mission-platform/forge-plugin-vue';
import { defineTsdownForgeHooks } from '@mission-platform/vite-plugin-forge';

const rootDirectory = import.meta.dirname;

export default defineTsdownForgeHooks({
  rootDir: rootDirectory,
  plugin: forgeVueFramework(),
  name: 'MissionPlatformObservers',
  overrides: {
    outDir: path.resolve(rootDirectory, 'dist/vue'),
  },
});
