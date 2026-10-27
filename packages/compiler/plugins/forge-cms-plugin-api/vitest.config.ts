import { defineVitestConfig } from "@mission-platform/vite-config/vitest";

export default defineVitestConfig({
  environment: "node",
  testTimeout: 60_000,
  hookTimeout: 60_000,
});
