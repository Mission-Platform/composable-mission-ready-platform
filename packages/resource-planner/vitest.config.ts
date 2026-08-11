import { defineVitestConfig } from "@mission-platform/vite-config/vitest";

export default defineVitestConfig({
  coverageInclude: ["src/**/*.ts"],
  coverageExclude: ["src/**/index.ts"],
});
