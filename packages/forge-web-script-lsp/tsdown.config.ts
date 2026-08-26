import { defineTsdownLibrary } from '@mission-platform/tsdown-config';

export default defineTsdownLibrary({
  rootDir: import.meta.dirname,
  platform: 'node',
  entry: {
    index: 'src/index.ts',
    main: 'src/main.ts',
    server: 'src/server.ts',
    workspace: 'src/workspace.ts',
  },
  unbundle: false,
  external: ['vscode-languageserver', 'vscode-languageserver-textdocument', 'vscode-jsonrpc'],
});

