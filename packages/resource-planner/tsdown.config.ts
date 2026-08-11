import path from "node:path";

import { forgeReactFramework } from "@mission-platform/forge-plugin-react";
import { forgeSolidFramework } from "@mission-platform/forge-plugin-solid";
import { forgeSvelteFramework } from "@mission-platform/forge-plugin-svelte";
import { forgeVueFramework } from "@mission-platform/forge-plugin-vue";
import { forgeWebComponentsFramework } from "@mission-platform/forge-plugin-web-components";
import { defineTsdownLibrary } from "@mission-platform/tsdown-config";
import { defineTsdownForgeComponents } from "@mission-platform/vite-plugin-forge";

const rootDirectory = import.meta.dirname;
const componentsModule = path.resolve(rootDirectory, "src/components/index.ts");

export default [
  defineTsdownLibrary({
    rootDir: import.meta.dirname,
    entry: "src/index.ts",
  }),
  defineTsdownLibrary({
    rootDir: import.meta.dirname,
    entry: "src/utils/index.ts",
    overrides: {
      outDir: "dist/utils",
    },
  }),
  ...defineTsdownForgeComponents({
    rootDir: rootDirectory,
    frameworks: [
      forgeReactFramework(),
      forgeSolidFramework(),
      forgeSvelteFramework(),
      forgeWebComponentsFramework(),
      forgeVueFramework(),
    ],
    componentsModule,
    name: "MissionPlatformResourcePlanner",
    declarationModule: "..",
  }),
];
