import { defineTsdownLibrary } from "@mission-platform/tsdown-config";

export default defineTsdownLibrary({
  rootDir: import.meta.dirname,
  entry: ["src/index.ts", "src/fixtures.ts"],
  dts: { tsc: { build: true } },
  autoExternalDevDeps: true,
  platform: "node",
});
