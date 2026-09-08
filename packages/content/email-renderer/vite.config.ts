import { defineLibraryConfig } from '@mission-platform/vite-config';

export default defineLibraryConfig({
  rootDir: import.meta.dirname,
  name: 'MissionPlatformEmailRenderer',
  entry: {
    index: 'src/index.ts',
    'adapters/vue': 'src/adapters/vue.ts',
    'adapters/react': 'src/adapters/react.ts',
    'adapters/svelte': 'src/adapters/svelte.ts',
    'adapters/solid': 'src/adapters/solid.ts',
    'adapters/web-components': 'src/adapters/web-components.ts',
    'adapters/index': 'src/adapters/index.ts',
  },
});
