import { defineTsdownLibrary } from '@mission-platform/tsdown-config';

export default defineTsdownLibrary({
  rootDir: import.meta.dirname,
  entry: {
    index: 'src/index.ts',
    'runtime/index': 'src/runtime/index.ts',
    'adapters/react': 'src/adapters/react.ts',
    'adapters/vue': 'src/adapters/vue.ts',
    'adapters/solid': 'src/adapters/solid.ts',
    'adapters/web-components': 'src/adapters/web-components.ts',
  },
  external: ['react', 'react-dom', 'solid-js'],
  overrides: {
    inputOptions: {
      transform: {
        jsx: {
          runtime: 'classic',
          factory: 'h',
          fragment: 'Fragment',
        },
      },
    },
  },
});
