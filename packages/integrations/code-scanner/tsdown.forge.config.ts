import { defineTsdownForgeTarget } from '@mission-platform/tsdown-config';

const rootDirectory = import.meta.dirname;

export default defineTsdownForgeTarget({
  rootDir: rootDirectory,
  entry: {
    index: 'src/index.ts',
  },
  unbundle: false,
  clean: false,
  external: ['@mission-platform/code-scanner-wasm'],
});
