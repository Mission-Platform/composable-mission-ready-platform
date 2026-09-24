import path from 'node:path';

import { defineTsdownForgeTarget } from '@mission-platform/tsdown-config';

const rootDirectory = import.meta.dirname;

export default defineTsdownForgeTarget({
  rootDir: rootDirectory,
  entry: 'src/components/index.ts',
  dts: true,
  clean: true,
  overrides: {
    outDir: path.resolve(rootDirectory, 'dist/components'),
  },
});
