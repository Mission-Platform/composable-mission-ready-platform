# @mission-platform/vite-plugin-tokens

Vite plugin that generates the Mission Platform design-token artefacts from the
[DTCG](https://www.designtokens.org/) `*.tokens.json` sources using a self-contained custom generator — no external CLI
is involved. Each non-theme source yields a matching self-contained SCSS partial (`generated/scss/_<file>.scss`:
its `$`-variables, `--mp-*` custom properties that interpolate the local
`$`-variables, and `@property` registrations) — the colour palette and the flattened composite typography are emitted
through this same structural path. The two theme sources are merged into one `generated/scss/_theme.scss` that drives
`:root { color-scheme: light dark; --mp-color-*: light-dark(<light>, <dark>) }`, with each value referencing a palette
`var(--mp-color-*)`, and also emits the opt-in `[data-theme]`/`.theme-*` `color-scheme` pins so importing the tokens is
enough to pin a subtree (or the document) to one scheme. Every source also yields a nested `as const` TypeScript module
(`generated/ts/<file>.ts`), alongside the aggregate `generated/_tokens.scss` (SCSS `@forward` barrel, which now includes
the theme) and `generated/tokens.ts` (TypeScript re-export barrel). Component sources are discovered recursively under
`tokens/component/{atoms,molecules,organisms,templates}/` and retain their relative level in
`generated/scss/component/<level>/` and `generated/ts/component/<level>/`. Component DTCG paths remain
`component.<layer>.*`, while their generated names use the layer namespace (`--mp-<layer>-*` and `$<layer>-*`), with no
`component` wrapper in the generated custom-property name. Runtime overrides still target the stable `component.*`
paths. The generator is split into focused modules
(`dtcg.ts`, `generators/scss.ts`,
`generators/typescript.ts`).

It replaces the per-package generation script: token code is produced as part of `vite build` (and on dev-server start)
via the rollup `buildStart` hook.

Sources are authored against the DTCG **v2025.10** schema and colours use the **OKLab** colour space.

## Token surface compatibility

The token audit removed 189 unreachable leaves (185 reviewed candidates plus 4 net second-order palette leaves, after restoring 2 reachable `.500` leaves). The
generated report now contains 2,841 leaves: 132 active, 2,161 protected, and 548 ambiguous, with no remaining
candidates. Regeneration is source-driven through the existing package build; do not edit `src/generated` manually.

This is an intentional published TypeScript-surface reduction: consumers must not import removed primitive, semantic,
typography, or structural leaves. Retained `component.*` DTCG paths, projected `--mp-<layer>-*`/`$<layer>-*` names,
aliases, and override selectors remain compatible. The three unresolved aliases (`color.surface.raised`, `radius.2xs`,
and `font.weight.light`) are pre-existing and were not introduced by the cleanup.

## Usage

```ts
// packages/ui/tokens/vite.config.ts
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
