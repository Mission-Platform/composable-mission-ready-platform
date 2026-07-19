import { compileAssemblyScript, type AssemblyScriptCompileOptions } from './compile.js';

import type { Plugin } from 'vite';

export { compileAssemblyScript } from './compile.js';
export type { AssemblyScriptCompileOptions } from './compile.js';
export { buildGeneratedModule, extractInstantiate } from './generate.js';

/** Options for {@link assemblyScriptPlugin}. */
export type AssemblyScriptPluginOptions = AssemblyScriptCompileOptions;

/**
 * Vite plugin that compiles an AssemblyScript (https://www.assemblyscript.org/)
 * entry to WebAssembly and emits a single self-contained ES module with the
 * wasm binary inlined as base64 (plus a memoised `loadModule()` factory).
 *
 * Compilation runs in the rollup `buildStart` hook, so the generated module is
 * (re)produced for `vite build`, `vite build --watch` and the dev server alike
 * — making `vite build` the single entry point for building AssemblyScript.
 */
export function assemblyScriptPlugin(options: AssemblyScriptPluginOptions): Plugin {
  return {
    name: '@mission-platform/vite-plugin-assemblyscript',
    async buildStart() {
      await compileAssemblyScript(options);
    },
  };
}

export default assemblyScriptPlugin;
