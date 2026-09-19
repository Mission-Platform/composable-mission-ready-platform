import { defineFlintVitestConfig } from './src/vitest.js';

export default defineFlintVitestConfig({
  environment: 'node',
  coverageInclude: ['src/**/*.ts'],
  coverageExclude: ['src/**/*.spec.ts'],
});
