import { assemblyScriptPlugin } from '@mission-platform/vite-plugin-assemblyscript';
import { defineLibraryConfig } from '@mission-platform/vite-config';

export default defineLibraryConfig({
  rootDir: __dirname,
  entry: {
    index: 'src/index.ts',
  },
  name: 'MissionPlatformPhoneNumber',
  // The wasm binary is inlined as base64 in `src/generated`, so keep each entry
  // self-contained rather than emitting a separate module graph.
  preserveModules: false,
  overrides: {
    plugins: [
      // Compile the AssemblyScript core to wasm and (re)generate the inlined,
      // self-contained module before the bundle is built.
      assemblyScriptPlugin({
        rootDir: __dirname,
        entry: 'assembly/index.ts',
        wasmFile: 'build/phone-number.wasm',
        outFile: 'src/generated/phone-number.js',
        emitText: true,
      }),
    ],
  },
});
