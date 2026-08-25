import { defineTsdownLibrary } from "@mission-platform/tsdown-config";

export default defineTsdownLibrary({
  rootDir: import.meta.dirname,
  platform: "node",
  entry: {
    index: "src/index.ts",
    main: "src/main.ts",
    args: "src/args.ts",
  },
  unbundle: false,
  external: ["@mission-platform/web-lua"],
});
