import { defineLibraryConfig } from '@mission-platform/vite-config';

export default defineLibraryConfig({
  rootDir: __dirname,
  entry: { ui: 'src/index.ts' },
  name: 'MissionPlatformUi',
});
