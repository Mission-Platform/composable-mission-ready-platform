import { defineTsdownLibrary } from '@mission-platform/tsdown-config';

export default defineTsdownLibrary({
  rootDir: import.meta.dirname,
  platform: 'neutral',
  external: ['cloudflare:sockets'],
});
