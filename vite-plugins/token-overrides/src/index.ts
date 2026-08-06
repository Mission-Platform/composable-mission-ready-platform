import fs from 'node:fs';
import path from 'node:path';

import { buildTokenOverrideScss, type OverrideGroup } from './transform';

import type { Plugin, ViteDevServer } from 'vite';

export * from './transform';

/** Options for {@link tokenOverridesPlugin}. */
export interface TokenOverridesPluginOptions {
  /**
   * Path to the DTCG-style override document (`*.tokens.json`), relative to the
   * Vite root (or absolute). This is the single source of truth for the app's
   * design-token overrides.
   */
  source: string;
  /**
   * Where to write the generated SCSS partial, relative to the Vite root (or
   * absolute). Import this file from your stylesheet *after*
   * `@mission-platform/tokens` so the overrides win the cascade. Defaults to the
   * `source` path with its `.tokens.json` (or `.json`) extension swapped for
   * `.generated.scss` (e.g. `design-tokens/overrides.tokens.json` →
   * `design-tokens/overrides.generated.scss`).
   */
  outFile?: string;
  /** Custom-property prefix, matching `@mission-platform/tokens`. Defaults to `mp`. */
  prefix?: string;
  /** Override the generated file's comment header. */
  header?: string;
}

/** Derive the default generated-file path from the source document path. */
function defaultOutFile(source: string): string {
  const directory = path.dirname(source);
  const base = path
    .basename(source)
    .replace(/\.tokens\.json$/i, '')
    .replace(/\.json$/i, '');
  return path.join(directory, `${base}.generated.scss`);
}

const defaultHeader = `/* Auto-generated design-token override — do not edit by hand.
   Edit the source \`*.tokens.json\` and let @mission-platform/vite-plugin-token-overrides
   regenerate this file on build / dev start. */`;

/**
 * Vite plugin that auto-generates an app's design-token *override* stylesheet.
 *
 * It reads a DTCG-style override document (`options.source`), transforms it with
 * {@link buildTokenOverrideScss}, and writes the resulting `:root { --<prefix>-*: … }`
 * SCSS partial to `options.outFile`. Import that generated file from your
 * stylesheet *after* `@mission-platform/tokens` so the overrides win the cascade.
 *
 * Generation runs in the rollup `buildStart` hook (so it covers `vite build`,
 * `vite build --watch`, and dev-server start alike) and re-runs when the source
 * document changes while the dev server is running. The generated file is a build
 * artefact — add it to `.gitignore`/`.prettierignore` rather than committing it.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { tokenOverridesPlugin } from '@mission-platform/vite-plugin-token-overrides';
 *
 * export default defineConfig({
 *   plugins: [tokenOverridesPlugin({ source: 'design-tokens/overrides.tokens.json' })],
 * });
 * ```
 * ```scss
 * // styles.css / styles.scss
 * @import '@mission-platform/tokens';
 * @import '../design-tokens/overrides.generated.scss';
 * ```
 */
export function tokenOverridesPlugin(options: TokenOverridesPluginOptions): Plugin {
  let root = process.cwd();

  /** Read the source document, transform it, and write the generated partial. */
  function generate(): { sourceFile: string; outFile: string } {
    const sourceFile = path.resolve(root, options.source);
    const outFile = path.resolve(root, options.outFile ?? defaultOutFile(options.source));

    const document = JSON.parse(fs.readFileSync(sourceFile, 'utf8')) as OverrideGroup;
    const scss = buildTokenOverrideScss(document, {
      prefix: options.prefix,
      header: options.header ?? defaultHeader,
    });

    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    // Skip no-op writes so we do not retrigger file watchers in a loop.
    if (!fs.existsSync(outFile) || fs.readFileSync(outFile, 'utf8') !== scss) {
      fs.writeFileSync(outFile, scss);
    }

    return { sourceFile, outFile };
  }

  return {
    name: '@mission-platform/vite-plugin-token-overrides',
    configResolved(config) {
      root = config.root;
    },
    buildStart() {
      generate();
    },
    configureServer(server: ViteDevServer) {
      const { sourceFile } = generate();
      // Regenerate whenever the override document is edited during dev.
      server.watcher.add(sourceFile);
      server.watcher.on('change', (file) => {
        if (path.resolve(file) === sourceFile) {
          generate();
        }
      });
    },
  };
}

export default tokenOverridesPlugin;
