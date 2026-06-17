import path from 'node:path';

import { defineLibraryConfig } from '@mission-platform/vite-config';
import { tokensPlugin } from '@mission-platform/vite-plugin-tokens';

export default defineLibraryConfig({
  rootDir: __dirname,
  entry: 'src/tokens.ts',
  name: 'MissionPlatformTokens',
  fileName: 'tokens',
  // Ship a single flat token bundle rather than a per-module tree.
  preserveModules: false,
  overrides: {
    plugins: [
      // Generate the SCSS/CSS/TS token artefacts from the DTCG sources in
      // tokens/ (OKLab colours, DTCG v2025.10) via asimonim, before the build.
      tokensPlugin({
        tokensDir: path.resolve(__dirname, 'tokens'),
        outDir: path.resolve(__dirname, 'src/generated'),
      }),
    ],
  },
});
