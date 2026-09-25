import path from 'node:path';

import { forgeReactFramework } from '@mission-platform/forge-plugin-react';
import { defineTsdownForgeHooks } from '@mission-platform/vite-plugin-forge';

const rootDirectory = import.meta.dirname;

export default defineTsdownForgeHooks({
  rootDir: rootDirectory,
  plugin: forgeReactFramework(),
  name: 'MissionPlatformRxjs',
  overrides: {
    outDir: path.resolve(rootDirectory, 'dist/react'),
  },
});
