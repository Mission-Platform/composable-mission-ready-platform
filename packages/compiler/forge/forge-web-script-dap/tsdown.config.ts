import { defineTsdownLibrary } from '@mission-platform/tsdown-config';

export default defineTsdownLibrary({
  rootDir: import.meta.dirname,
  platform: 'node',
  entry: {
    index: 'src/index.ts',
    main: 'src/main.ts',
    protocol: 'src/protocol.ts',
    server: 'src/server.ts',
  },
  unbundle: false,
});
