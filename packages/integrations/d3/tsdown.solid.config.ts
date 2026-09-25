import path from 'node:path';

import { forgeSolidFramework } from '@mission-platform/forge-plugin-solid';
import { defineTsdownForgeHooks } from '@mission-platform/vite-plugin-forge';

const rootDirectory = import.meta.dirname;

export default defineTsdownForgeHooks({
  rootDir: rootDirectory,
  plugin: forgeSolidFramework(),
  name: 'MissionPlatformD3',
  overrides: {
    outDir: path.resolve(rootDirectory, 'dist/solid'),
  },
});
