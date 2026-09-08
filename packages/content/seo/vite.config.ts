import { defineLibraryConfig } from '@mission-platform/vite-config';

export default defineLibraryConfig({
  rootDir: import.meta.dirname,
  entry: 'src/index.ts',
  name: 'MissionPlatformSeo',
});
