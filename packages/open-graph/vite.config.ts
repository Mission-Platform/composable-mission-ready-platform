import { defineLibraryConfig } from '@mission-platform/vite-config';

export default defineLibraryConfig({
  rootDir: __dirname,
  entry: { 'open-graph': 'src/index.ts' },
  name: 'MissionPlatformOpenGraph',
});
