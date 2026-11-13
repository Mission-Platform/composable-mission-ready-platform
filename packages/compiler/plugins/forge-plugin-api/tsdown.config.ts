import { defineTsdownLibrary } from "@mission-platform/tsdown-config";

export default defineTsdownLibrary({
  rootDir: import.meta.dirname,
  entry: [
    "src/index.ts",
    "src/schema.ts",
    "src/compiler/ast.ts",
    "src/compiler/hoist-static.ts",
    "src/compiler/optimize.ts",
    "src/testing.ts",
  ],
  dts: { tsc: { build: true } },
  autoExternalDevDeps: true,
  platform: "node",
});
