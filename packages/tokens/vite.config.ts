import { defineLibraryConfig } from '@mission-platform/vite-config';

export default defineLibraryConfig({
  rootDir: __dirname,
  entry: 'src/tokens.ts',
  name: 'MissionPlatformTokens',
  fileName: 'tokens',
  // Ship a single flat token bundle rather than a per-module tree.
  preserveModules: false,
});
