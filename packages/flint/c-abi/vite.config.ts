import { defineLibraryConfig } from "@mission-platform/vite-config";

export default defineLibraryConfig({
  rootDir: __dirname,
  entry: {
    index: "src/index.ts",
  },
  name: "MissionPlatformFlintCAbi",
});
