import fs from "node:fs";
import path from "node:path";

import { defineConfig } from "tsdown";

const rootDirectory = import.meta.dirname;
const package_ = JSON.parse(
  fs.readFileSync(path.join(rootDirectory, "package.json"), "utf8"),
);
const externalNames = [
  "vue",
  "vue-router",
  "@mission-platform/i18n",
  ...Object.keys(package_.dependencies || {}),
  ...Object.keys(package_.peerDependencies || {}),
  ...Object.keys(package_.devDependencies || {}),
];

export default defineConfig({
  entry: [path.resolve(rootDirectory, "src/index.ts")],
  format: ["esm"],
  platform: "node",
  dts: { build: true },
  tsconfig: path.resolve(rootDirectory, "tsconfig.build.json"),
  clean: true,
  sourcemap: false,
  fixedExtension: false,
  outDir: path.resolve(rootDirectory, "dist"),
  unbundle: true,
  deps: {
    neverBundle: (id) => {
      if (externalNames.includes(id)) return true;
      for (const name of externalNames) {
        if (id.startsWith(`${name}/`)) return true;
      }
      return false;
    },
  },
});
