import { defineTsdownLibrary } from '@mission-platform/tsdown-config';

export default defineTsdownLibrary({
  rootDir: import.meta.dirname,
  platform: 'node',
  unbundle: false,
  // Inline mcp-shared; externalize only the real npm runtime deps.
  external: ['@modelcontextprotocol/sdk', 'zod'],
});
