# `@mission-platform/vite-plugin-flint`

Vite adapter for Flint (`.flint`, `.flt`) modules. The plugin delegates source
loading and compilation to `@mission-platform/flint`, then returns a
browser-safe typed ESM loader with the ABI manifest and embedded WebAssembly.

```ts
import { flintPlugin } from "@mission-platform/vite-plugin-flint";

export default {
  plugins: [flintPlugin()],
};
```

The compiler artifacts are also available as explicit virtual modules:

- `module.flint?flint-manifest`
- `module.flint?flint-wasm`
- `module.flint?flint-declarations`
- `module.flint?flint-source-map`

During production builds the plugin emits hashed WASM, ABI manifest, and
declaration assets. In watch mode only the changed `.flint` module is invalidated
through the compiler service.

## Cross-project link profiles

Use `linkProfile: "static"` for a self-contained artifact. Cross-project Flint
modules are flattened into the scanner graph, release optimization is enabled,
and the manifest records the `static-aggressive` link-time profile. This is the
best option for distribution because it avoids runtime module lookup, at the
cost of a larger build and less independently cacheable decoder modules.

Use `linkProfile: "dynamic"` to preserve explicit source-module boundaries:

```ts
plugins: [
  flintPlugin({
    projectRoots: ["./src", "../shared/src"],
    linkProfile: "dynamic",
  }),
];
```

The emitted manifest contains resolved module IDs, aliases, and ABI export
signatures. The generated ESM adapter exposes `resolveDynamicExport` and
`resolveDynamicExportSync`; each module/export is resolved once and cached for
that artifact. `dynamicLinkMetadata` includes an artifact and manifest identity
so consumers can clear or replace a cache when a linked module changes. Dynamic
links are source-module bindings, not ambient host capabilities.
