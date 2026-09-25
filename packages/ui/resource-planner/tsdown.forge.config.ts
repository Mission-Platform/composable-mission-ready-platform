import {
  defineTsdownForgeTarget,
  defineTsdownLibrary,
} from "@mission-platform/tsdown-config";

const rootDirectory = import.meta.dirname;

export default [
  defineTsdownForgeTarget({
    rootDir: rootDirectory,
    entry: "src/index.ts",
    clean: false,
  }),
  defineTsdownLibrary({
    rootDir: rootDirectory,
    entry: "src/utils/index.ts",
    clean: false,
    overrides: {
      outDir: "dist/utils",
    },
  }),
];
