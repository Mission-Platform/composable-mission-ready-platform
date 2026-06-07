import { defineLibraryConfig } from '@mission-platform/vite-config';
import svgLoader from 'vite-svg-loader';

export default defineLibraryConfig({
  rootDir: __dirname,
  name: 'MissionPlatformIcons',
  fileName: 'icons',
  overrides: {
    plugins: [
      svgLoader({
        svgo: true,
        defaultImport: 'component',
        svgoConfig: { multipass: true, datauri: 'unenc' },
      }),
    ],
  },
});
