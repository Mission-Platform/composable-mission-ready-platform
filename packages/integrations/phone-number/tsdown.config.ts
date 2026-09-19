import { defineTsdownLibrary } from '@mission-platform/tsdown-config';
import flintPlugin from '@mission-platform/vite-plugin-flint';

/**
 * Single self-contained ESM bundle: the Flint core is compiled to
 * wasm and inlined by the Flint plugin before the bundle step, so the module
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
      flintPlugin({
        root: import.meta.dirname,
      }),
    ],
  },
});
