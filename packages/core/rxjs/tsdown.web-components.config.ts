import path from 'node:path';

import { forgeWebComponentsFramework } from '@mission-platform/forge-plugin-web-components';
import { defineTsdownForgeHooks } from '@mission-platform/vite-plugin-forge';

const rootDirectory = import.meta.dirname;

export default defineTsdownForgeHooks({
  rootDir: rootDirectory,
  plugin: forgeWebComponentsFramework(),
  name: 'MissionPlatformRxjs',
  overrides: {
    outDir: path.resolve(rootDirectory, 'dist/web-components'),
  },
});
