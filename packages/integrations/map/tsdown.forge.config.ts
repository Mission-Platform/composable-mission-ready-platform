import { defineTsdownForgeTarget } from '@mission-platform/tsdown-config';

const rootDirectory = import.meta.dirname;

export default defineTsdownForgeTarget({
  rootDir: rootDirectory,
  entry: 'src/index.ts',
  clean: true,
});
