import { defineTsdownLibrary } from '@mission-platform/tsdown-config';

export default defineTsdownLibrary({
  rootDir: import.meta.dirname,
  entry: ['src/index.ts', 'src/forge-web-script.d.ts'],
  platform: 'node',
});
