import { generateTokens, type TokensPluginOptions } from './generate.js';

import type { Plugin } from 'vite';

export type { TokensPluginOptions } from './generate.js';
export type { DtcgColorValue, DtcgGroup, DtcgToken, TokenRecord } from './dtcg.js';
export {
  aliasToCssVariable,
  camelCase,
  camelCaseName,
  compareTokens,
  dashedName,
  flattenTokens,
  formatColorValue,
  formatCssColor,
  formatCssValue,
  groupLabel,
  resolveAlias,
  resolveTsValue,
} from './dtcg.js';
export {
  buildLightDarkThemeScss,
  buildPropertyRule,
  buildScssVariables,
  buildScssVariablesScss,
  buildStructuralScss,
  buildTypographyRecords,
  typographyEntries,
} from './generators/scss.js';
export { buildBarrelModule, buildTokenModule } from './generators/typescript.js';
export { generateTokens } from './generate.js';

/**
 * Vite plugin that generates the Mission Platform design-token artefacts from the
 * DTCG (https://www.designtokens.org/) sources using a self-contained custom
 * generator — no external CLI is involved. Each `*.tokens.json` source yields a
 * matching `generated/scss/<file>.scss` (self-contained `$`-variables, `--mp-*`
 * custom properties, and their `@property` registrations) and a nested `as const`
 * `generated/ts/<file>.ts` module, alongside the `generated/_tokens.scss` (SCSS
 * barrel) and `generated/tokens.ts` (TypeScript barrel) aggregates.
 *
 * Generation runs in the rollup `buildStart` hook, so the artefacts are produced
 * for `vite build`, `vite build --watch`, and the dev server alike.
 */
export function tokensPlugin(options: TokensPluginOptions): Plugin {
  return {
    name: '@mission-platform/vite-plugin-tokens',
    buildStart() {
      generateTokens(options);
    },
  };
}

export default tokensPlugin;
