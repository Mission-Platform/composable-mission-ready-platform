import { defineTsdownLibrary } from '@mission-platform/tsdown-config';

const rootDirectory = import.meta.dirname;

export default defineTsdownLibrary({
  rootDir: rootDirectory,
  entry: 'src/index.ts',
});
