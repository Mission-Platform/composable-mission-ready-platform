import path from 'node:path';

import { forgeSvelteFramework } from '@mission-platform/forge-plugin-svelte';
import { defineTsdownForgeHooks } from '@mission-platform/vite-plugin-forge';

const rootDirectory = import.meta.dirname;

export default defineTsdownForgeHooks({
  rootDir: rootDirectory,
  plugin: forgeSvelteFramework(),
  name: 'MissionPlatformSpeechAudio',
  overrides: {
    outDir: path.resolve(rootDirectory, 'dist/svelte'),
  },
});
