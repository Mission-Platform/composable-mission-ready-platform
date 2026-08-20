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
