import {
  defineTsdownForgeTarget,
  defineTsdownLibrary,
} from "@mission-platform/tsdown-config";

const rootDirectory = import.meta.dirname;

export default [
  defineTsdownForgeTarget({
    rootDir: rootDirectory,
    entry: "src/index.ts",
  }),
  defineTsdownLibrary({
    rootDir: rootDirectory,
    entry: "src/utils/index.ts",
    overrides: {
      outDir: "dist/utils",
    },
  }),
];
