import { defineTsdownLibrary } from '@mission-platform/tsdown-config';

export default defineTsdownLibrary({
  rootDir: import.meta.dirname,
  entry: {
    index: 'src/index.ts',
    'jsx-runtime': 'src/runtime/jsx-runtime.ts',
    'jsx-dev-runtime': 'src/runtime/jsx-dev-runtime.ts',
    'runtime/index': 'src/runtime/index.ts',
  },
});
