import path from 'node:path';

import { forgeWebComponentsFramework } from '@mission-platform/forge-plugin-web-components';
import { defineTsdownForgeComponentsAll } from '@mission-platform/vite-plugin-forge';

const rootDirectory = import.meta.dirname;
const componentsModule = path.resolve(rootDirectory, 'src/components/index.ts');

export default defineTsdownForgeComponentsAll({
  rootDir: rootDirectory,
  frameworks: [forgeWebComponentsFramework()],
  componentsModule,
  name: 'MissionPlatformJsxLayouts',
  external: ['i18next'],
  declarationModule: '..',
  overrides: {
    outDir: path.resolve(rootDirectory, 'dist/web-components'),
  },
});
