# @mission-platform/vite-plugin-tokens

Vite plugin that generates the Mission Platform design-token artefacts from the
[DTCG](https://www.designtokens.org/) `*.tokens.json` sources using a
self-contained custom generator — no external CLI is involved. Each non-theme
source yields a matching self-contained SCSS partial (`generated/scss/_<file>.scss`:
its `$`-variables, `--mp-*` custom properties that interpolate the local
`$`-variables, and `@property` registrations) — the colour palette and the
flattened composite typography are emitted through this same structural path. The
two theme sources are merged into one `generated/scss/_theme.scss` that drives
`:root { color-scheme: light dark; --mp-color-*: light-dark(<light>, <dark>) }`,
with each value referencing a palette `var(--mp-color-*)`, and also emits the
opt-in `[data-theme]`/`.theme-*` `color-scheme` pins so importing the tokens is
enough to pin a subtree (or the document) to one scheme. Every source also
yields a nested `as const` TypeScript module (`generated/ts/<file>.ts`), alongside
the aggregate `generated/_tokens.scss` (SCSS `@forward` barrel, which now includes
the theme) and `generated/tokens.ts` (TypeScript re-export barrel). The generator
is split into focused modules (`dtcg.ts`, `generators/scss.ts`,
`generators/typescript.ts`).

It replaces the per-package generation script: token code is produced as part
of `vite build` (and on dev-server start) via the rollup `buildStart` hook.

Sources are authored against the DTCG **v2025.10** schema and colours use the
**OKLab** colour space.

## Usage

```ts
// packages/tokens/vite.config.ts
import { tokensPlugin } from '@mission-platform/vite-plugin-tokens';
import { defineLibraryConfig } from '@mission-platform/vite-config';

export default defineLibraryConfig({
  rootDir: __dirname,
  entry: 'src/tokens.ts',
  name: 'MissionPlatformTokens',
  preserveModules: false,
  overrides: {
    plugins: [
      tokensPlugin({
        tokensDir: `${__dirname}/tokens`,
        outDir: `${__dirname}/src/generated`,
      }),
    ],
  },
});
```

See [`llms.txt`](./llms.txt) for the full input/output list and API.
