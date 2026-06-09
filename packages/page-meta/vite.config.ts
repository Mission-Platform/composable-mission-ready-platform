import { defineLibraryConfig } from '@mission-platform/vite-config';

export default defineLibraryConfig({
  rootDir: __dirname,
  entry: { 'page-meta': 'src/index.ts' },
  name: 'MissionPlatformPageMeta',
});
