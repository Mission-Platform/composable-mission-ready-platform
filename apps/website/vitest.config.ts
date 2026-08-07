import { fileURLToPath, URL } from 'node:url';

import { defineVitestConfig } from '@mission-platform/vite-config/vitest';

export default defineVitestConfig({
  environment: 'node',
  overrides: {
    resolve: {
      alias: {
        'virtual:i18n-locales': fileURLToPath(new URL('src/__tests__/virtual-i18n-locales.ts', import.meta.url)),
      },
    },
  },
});
