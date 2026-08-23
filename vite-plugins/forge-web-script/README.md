# `@mission-platform/vite-plugin-forge-web-script`

Vite adapter for Forge Web Script (`.fws`) modules. The plugin delegates source
loading and compilation to `@mission-platform/forge-web-script`, then returns a
browser-safe typed ESM loader with the ABI manifest and embedded WebAssembly.

```ts
import { forgeWebScriptPlugin } from "@mission-platform/vite-plugin-forge-web-script";

export default {
  plugins: [forgeWebScriptPlugin()],
};
```

The compiler artifacts are also available as explicit virtual modules:

- `module.fws?forge-web-script-manifest`
- `module.fws?forge-web-script-wasm`
- `module.fws?forge-web-script-declarations`
- `module.fws?forge-web-script-source-map`

During production builds the plugin emits hashed WASM, ABI manifest, and
declaration assets. In watch mode only the changed `.fws` module is invalidated
through the compiler service.

## Cross-project link profiles

Use `linkProfile: "static"` for a self-contained artifact. Cross-project FWS
modules are flattened into the scanner graph, release optimization is enabled,
and the manifest records the `static-aggressive` link-time profile. This is the
best option for distribution because it avoids runtime module lookup, at the
cost of a larger build and less independently cacheable decoder modules.

Use `linkProfile: "dynamic"` to preserve explicit source-module boundaries:

```ts
plugins: [
  forgeWebScriptPlugin({
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
