import path from 'node:path';

import { defineTsdownForgeTarget, defineTsdownLibrary } from '@mission-platform/tsdown-config';

const rootDirectory = import.meta.dirname;

export default [
  defineTsdownForgeTarget({
    rootDir: rootDirectory,
    entry: 'src/components/index.ts',
    clean: true,
    overrides: {
      outDir: path.resolve(rootDirectory, 'dist/components'),
    },
  }),
  defineTsdownLibrary({
    rootDir: rootDirectory,
    entry: 'src/sprite/asset.ts',
    clean: false,
    overrides: {
      outDir: path.resolve(rootDirectory, 'dist/sprite'),
    },
  }),
];
