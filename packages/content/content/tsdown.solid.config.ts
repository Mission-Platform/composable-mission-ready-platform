import path from 'node:path';

import { forgeSolidFramework } from '@mission-platform/forge-plugin-solid';
import { defineTsdownForgeComponentsAll } from '@mission-platform/vite-plugin-forge';

const rootDirectory = import.meta.dirname;
const componentsModule = path.resolve(rootDirectory, 'src/components/index.ts');

export default defineTsdownForgeComponentsAll({
  rootDir: rootDirectory,
  frameworks: [forgeSolidFramework()],
  componentsModule,
  name: 'MissionPlatformContent',
  overrides: {
    outDir: path.resolve(rootDirectory, 'dist/solid'),
  },
});
