import { defineLibraryConfig } from '@mission-platform/vite-config';

export default defineLibraryConfig({
  rootDir: __dirname,
  entry: { seo: 'src/index.ts' },
  name: 'MissionPlatformSeo',
});
