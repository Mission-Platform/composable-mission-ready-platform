import { defineLibraryConfig } from '@mission-platform/vite-config';

export default defineLibraryConfig({
  rootDir: __dirname,
  entry: 'src/index.ts',
  name: 'MissionPlatformMap',
  external: ['maplibre-gl'],
  globals: { 'maplibre-gl': 'maplibregl' },
});
