import { defineTsdownLibrary } from '@mission-platform/tsdown-config';

export default defineTsdownLibrary({
  rootDir: import.meta.dirname,
  entry: {
    react: 'src/adapters/react.ts',
    vue: 'src/adapters/vue.ts',
    solid: 'src/adapters/solid.ts',
    svelte: 'src/adapters/svelte.ts',
    'web-components': 'src/adapters/web-components.ts',
  },
  external: ['react', 'react-dom', 'solid-js', 'svelte', 'vue'],
});
