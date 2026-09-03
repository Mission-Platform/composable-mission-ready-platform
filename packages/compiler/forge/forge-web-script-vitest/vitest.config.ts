import { defineForgeWebScriptVitestConfig } from './src/vitest.js';

export default defineForgeWebScriptVitestConfig({
  environment: 'node',
  coverageInclude: ['src/**/*.ts'],
  coverageExclude: ['src/**/*.spec.ts'],
});
