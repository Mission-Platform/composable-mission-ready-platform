import { defineVitestConfig } from '@mission-platform/vite-config/vitest';

export default defineVitestConfig({
  overrides: {
    test: {
      setupFiles: ['./src/test-utils/setup.ts'],
    },
  },
});
