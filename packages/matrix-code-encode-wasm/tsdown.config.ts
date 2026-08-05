import fs from "node:fs";

import { defineTsdownLibrary } from "@mission-platform/tsdown-config";

import type { TsdownPlugin } from "tsdown";

/**
 * Inline the wasm-pack `_bg.wasm` binary (`src/wasm/*.wasm`) as a base64 string
 * default export so the built `dist/index.js` embeds the module and stays
 * self-contained — no sibling `.wasm` file to fetch at runtime.
 */
function inlineWasmBase64Plugin(): TsdownPlugin {
  return {
    name: "mission-platform:inline-wasm-base64",
    enforce: "pre",
    load(id) {
      const filePath = id.split("?")[0] ?? id;
      if (!filePath.endsWith(".wasm") || !fs.existsSync(filePath)) {
        return;
      }
      const base64 = fs.readFileSync(filePath).toString("base64");
      return `export default ${JSON.stringify(base64)};`;
    },
  };
}

/**
 * Single self-contained ESM bundle (`dist/index.js` + `dist/index.d.ts`) that
 * embeds the wasm binary. The wasm-bindgen glue in `src/wasm/` and the base64
 * binary are bundled in (not externalised), so consumers get a ready-to-use,
 * synchronously-initialised module with no runtime `.wasm` dependency.
 */
export default defineTsdownLibrary({
  rootDir: import.meta.dirname,
  entry: { index: "src/index.ts" },
  unbundle: false,
  clean: true,
  // Bundle the generated glue + inlined wasm into the single output.
  autoExternalDeps: false,
  overrides: {
    plugins: [inlineWasmBase64Plugin()],
  },
});
