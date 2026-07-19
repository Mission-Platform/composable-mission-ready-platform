# @mission-platform/vite-plugin-assemblyscript

A Vite plugin that compiles an [AssemblyScript](https://www.assemblyscript.org/)
entry to **WebAssembly** and emits a single self-contained ES module with the
wasm binary **inlined as base64** — so consuming packages get a dependency-free
module with no `.wasm` URL resolution in bundlers or Web Workers.

Compilation runs the AssemblyScript compiler (`asc`) programmatically inside the
rollup `buildStart` hook, so it is (re)produced for `vite build`,
`vite build --watch` and the dev server alike — making `vite build` the single
entry point for building AssemblyScript.

## Usage

```ts
// vite.config.ts
import { assemblyScriptPlugin } from '@mission-platform/vite-plugin-assemblyscript';
import { defineLibraryConfig } from '@mission-platform/vite-config';

export default defineLibraryConfig({
  rootDir: __dirname,
  entry: { index: 'src/index.ts' },
  preserveModules: false,
  overrides: {
    plugins: [
      assemblyScriptPlugin({
        rootDir: __dirname,
        entry: 'assembly/index.ts',
        wasmFile: 'build/module.wasm',
        outFile: 'src/generated/module.js',
      }),
    ],
  },
});
```

The generated module exports a memoised async `loadModule()` that returns the
raw AssemblyScript exports:

```ts
import { loadModule } from './generated/module.js';

const wasm = await loadModule();
wasm.someExportedFunction(/* … */);
```

Provide a hand-maintained `.d.ts` next to the generated `.js` to type the raw
exports (the plugin only writes the `.js`).

## Options

| Option          | Type      | Default             | Description                                         |
| --------------- | --------- | ------------------- | --------------------------------------------------- |
| `entry`         | `string`  | —                   | AssemblyScript entry `.ts` (relative to `rootDir`). |
| `outFile`       | `string`  | —                   | Generated self-contained ES module to emit.         |
| `wasmFile`      | `string`  | `build/module.wasm` | Intermediate `.wasm` path used by the compiler.     |
| `rootDir`       | `string`  | `process.cwd()`     | Base directory for resolving relative paths.        |
| `optimizeLevel` | `number`  | `3`                 | `asc` optimize level (`-O`).                        |
| `shrinkLevel`   | `number`  | `1`                 | `asc` shrink level.                                 |
| `emitText`      | `boolean` | `false`             | Also emit a human-readable `.wat` next to the wasm. |
