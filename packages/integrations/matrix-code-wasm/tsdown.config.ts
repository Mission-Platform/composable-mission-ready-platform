import { defineTsdownLibrary } from '@mission-platform/tsdown-config';
import forgeWebScriptPlugin from '@mission-platform/vite-plugin-forge-web-script';

export default [
  defineTsdownLibrary({
    rootDir: import.meta.dirname,
    entry: {
      index: 'src/index.ts',
    },
    unbundle: false,
    clean: true,
    overrides: {
      plugins: [forgeWebScriptPlugin({ rootDir: import.meta.dirname, requireExports: false, selfHostedVmMode: 'aot' })],
    },
  }),
];
