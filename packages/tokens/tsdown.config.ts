import path from 'node:path';

import { defineTsdownLibrary } from '@mission-platform/tsdown-config';
import { generateTokens } from '@mission-platform/vite-plugin-tokens';

export default defineTsdownLibrary({
  rootDir: import.meta.dirname,
  entry: {
    tokens: 'src/tokens.ts',
  },
  // Ensure the emitted JS is named `tokens.js` (not `index.js`)
  // and the dts is `tokens.d.ts`.
  unbundle: false,
  overrides: {
    hooks: {
      'build:prepare': () => {
        generateTokens({
          tokensDir: path.resolve(import.meta.dirname, 'tokens'),
          outDir: path.resolve(import.meta.dirname, 'src/generated'),
        });
      },
    },
  },
});
