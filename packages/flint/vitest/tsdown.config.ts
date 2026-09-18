import { defineTsdownLibrary } from '@mission-platform/tsdown-config';

export default defineTsdownLibrary({
  rootDir: import.meta.dirname,
  entry: ['src/index.ts', 'src/flint.d.ts'],
  platform: 'node',
});
