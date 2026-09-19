import { defineTsdownLibrary } from '@mission-platform/tsdown-config';
import flintPlugin from '@mission-platform/vite-plugin-flint';

export default [
  defineTsdownLibrary({
    rootDir: import.meta.dirname,
    entry: {
      index: 'src/index.ts',
    },
    unbundle: false,
    clean: true,
    overrides: {
      plugins: [flintPlugin({ rootDir: import.meta.dirname, requireExports: false })],
    },
  }),
];
