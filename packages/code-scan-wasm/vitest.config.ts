import fs from "node:fs";

import { defineConfig } from "vitest/config";

import type { Plugin } from "vite";

/**
 * Mirror the tsdown `inline-wasm-base64` plugin for the test runtime: load any
 * imported `.wasm` binary as a base64 string default export so the wrapper's
 * synchronous `WebAssembly.Instance` path works when the tests import `src`
 * directly (rather than the built, already-inlined `dist`).
 */
function inlineWasmBase64Plugin(): Plugin {
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

export default defineConfig({
  plugins: [inlineWasmBase64Plugin()],
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/*.spec.ts"],
  },
});
