import { defineTsdownLibrary } from '@mission-platform/tsdown-config';
import forgeWebScriptPlugin from '@mission-platform/vite-plugin-forge-web-script';

/**
 * Single self-contained ESM bundle: the Forge Web Script core is compiled to
 * wasm and inlined by the FWS plugin before the bundle step, so the module
 * graph is flattened (`unbundle: false`) rather than preserve-modules.
 */
export default defineTsdownLibrary({
  rootDir: import.meta.dirname,
  entry: {
    index: 'src/index.ts',
  },
  unbundle: false,
  dts: true,
  overrides: {
    plugins: [
      forgeWebScriptPlugin({
        root: import.meta.dirname,
      }),
    ],
  },
});
