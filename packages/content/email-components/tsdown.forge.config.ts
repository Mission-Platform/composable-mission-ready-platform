import path from 'node:path';

import { defineTsdownForgeTarget } from '@mission-platform/tsdown-config';
import { defineTsdownForgeEmailComponents } from '@mission-platform/vite-plugin-forge';

const rootDirectory = import.meta.dirname;
const componentsModule = path.resolve(rootDirectory, 'src/components/index.ts');

export default [
  defineTsdownForgeTarget({
    rootDir: rootDirectory,
    entry: 'src/index.ts',
    clean: false,
  }),
  defineTsdownForgeEmailComponents({
    rootDir: rootDirectory,
    componentsModule,
    name: 'MissionPlatformEmailComponents',
    external: ['@mission-platform/email-renderer'],
  }),
];
