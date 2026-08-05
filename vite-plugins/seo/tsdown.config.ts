import { defineTsdownLibrary } from '@mission-platform/tsdown-config';

export default defineTsdownLibrary({
  rootDir: import.meta.dirname,
  // Vite plugins import `node:*` builtins — mark the runtime as Node so they
  // externalise cleanly (avoids UNRESOLVED_IMPORT warnings under `neutral`).
  platform: 'node',
});
