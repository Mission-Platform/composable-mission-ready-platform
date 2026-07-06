import { defineLibraryConfig } from '@mission-platform/vite-config';

export default defineLibraryConfig({
  rootDir: __dirname,
  name: 'MissionPlatformJsx',
  // Multiple entries so the framework adapters (which are intentionally kept
  // out of the root barrel) are emitted as their own subpath modules.
  entry: {
    index: 'src/index.ts',
    'runtime/index': 'src/runtime/index.ts',
    'adapters/react': 'src/adapters/react.ts',
    'adapters/vue': 'src/adapters/vue.ts',
  },
  overrides: {
    // The package authors its components in JSX compiled by the classic
    // factory, so esbuild must call `h`/`Fragment` rather than React's runtime.
    esbuild: {
      jsxFactory: 'h',
      jsxFragment: 'Fragment',
    },
  },
});
