import { defineTsdownLibrary } from '@mission-platform/tsdown-config';
import { assemblyScriptPlugin } from '@mission-platform/vite-plugin-assemblyscript';

/**
 * Single self-contained ESM bundle: the AssemblyScript core is compiled to
 * wasm and inlined as base64 in `src/generated` before the bundle step, so the
 * module graph is flattened (`unbundle: false`) rather than preserve-modules.
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
      assemblyScriptPlugin({
        rootDir: import.meta.dirname,
        entry: 'assembly/index.ts',
        wasmFile: 'build/phone-number.wasm',
        outFile: 'src/generated/phone-number.js',
        emitText: true,
      }) as never,
    ],
  },
});
