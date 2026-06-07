import { defineLibraryConfig } from '@mission-platform/vite-config';

export default defineLibraryConfig({
  rootDir: __dirname,
  entry: { i18n: 'src/index.ts' },
  name: 'MissionPlatformI18n',
});
