import path from "node:path";

import { forgeVueFramework } from "@mission-platform/forge-plugin-vue";
import { defineTsdownForgeComponentsAll } from "@mission-platform/vite-plugin-forge";

const rootDirectory = import.meta.dirname;
const componentsModule = path.resolve(rootDirectory, "src/components/index.ts");

export default defineTsdownForgeComponentsAll({
  rootDir: rootDirectory,
  frameworks: [forgeVueFramework()],
  componentsModule,
  name: "MissionPlatformResourcePlanner",
  declarationModule: "..",
  overrides: {
    outDir: path.resolve(rootDirectory, "dist/vue"),
  },
});
