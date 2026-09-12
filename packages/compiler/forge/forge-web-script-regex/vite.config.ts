import { defineLibraryConfig } from "@mission-platform/vite-config";

export default defineLibraryConfig({
  rootDir: import.meta.dirname,
  entry: {
    index: "src/index.ts",
    reference: "src/reference.ts",
  },
  name: "MissionPlatformForgeWebScriptRegex",
});
