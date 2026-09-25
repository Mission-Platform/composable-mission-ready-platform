import path from 'node:path';

import { forgeReactFramework } from '@mission-platform/forge-plugin-react';
import { defineTsdownForgeComponentsAll } from '@mission-platform/vite-plugin-forge';

const rootDirectory = import.meta.dirname;
const componentsModule = path.resolve(rootDirectory, 'src/components/index.ts');

export default defineTsdownForgeComponentsAll({
  rootDir: rootDirectory,
  frameworks: [forgeReactFramework()],
  componentsModule,
  name: 'MissionPlatformJsxComponents',
  external: ['i18next'],
  declarationModule: '..',
  overrides: {
    outDir: path.resolve(rootDirectory, 'dist/react'),
  },
});
