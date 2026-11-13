import { defineTsdownLibrary } from "@mission-platform/tsdown-config";

export default defineTsdownLibrary({
  rootDir: import.meta.dirname,
  entry: ["src/index.ts", "src/runtime/solid.ts"],
  dts: { tsc: { build: true } },
  autoExternalDevDeps: true,
  platform: "node",
});
