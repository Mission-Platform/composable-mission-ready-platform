import { defineLibraryConfig } from '@mission-platform/vite-config';

export default defineLibraryConfig({
  rootDir: __dirname,
  entry: 'src/tokens.ts',
  name: 'MissionPlatformTokens',
  fileName: 'tokens',
  overrides: {
    build: {
      rollupOptions: {
        output: {
          preserveModules: false,
        },
      },
    },
  },
});
