import path from 'node:path';

import { forgeSvelteFramework } from '@mission-platform/forge-plugin-svelte';
import { defineTsdownForgeComponentsAll } from '@mission-platform/vite-plugin-forge';

const rootDirectory = import.meta.dirname;
const componentsModule = path.resolve(rootDirectory, 'src/components/index.ts');

export default defineTsdownForgeComponentsAll({
  rootDir: rootDirectory,
  frameworks: [forgeSvelteFramework()],
  componentsModule,
  name: 'MissionPlatformQrCode',
  external: ['i18next', '@mission-platform/qr-code-wasm'],
  declarationModule: '..',
  overrides: {
    outDir: path.resolve(rootDirectory, 'dist/svelte'),
  },
});
