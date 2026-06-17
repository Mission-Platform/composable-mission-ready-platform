import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { flattenTokens, type DtcgGroup } from './dtcg.js';
import {
  buildLightDarkThemeScss,
  buildScssVariablesScss,
  buildStructuralScss,
  buildTypographyRecords,
} from './generators/scss.js';
import { buildBarrelModule, buildTokenModule } from './generators/typescript.js';

const { join } = path;

/**
 * Options for {@link generateTokens} / the `tokensPlugin`.
 *
 * Generation is fully self-contained — the artefacts are produced directly from
 * the DTCG sources by the emitters in `dtcg.ts`, `generators/scss.ts`, and
 * `generators/typescript.ts` (no external CLI is involved). Each `*.tokens.json`
 * source yields a matching `generated/ts/<file>.ts`; every non-theme source also
 * yields a matching `generated/scss/_<file>.scss`, and the two theme sources are
 * merged into a single `generated/scss/_theme.scss`. The aggregate
 * `generated/_tokens.scss` (SCSS barrel) and `generated/tokens.ts` (TS barrel)
 * are written alongside them.
 */
export interface TokensPluginOptions {
  /** Absolute path to the directory containing the DTCG `*.tokens.json` sources. */
  tokensDir: string;
  /** Absolute path to the directory where generated artefacts are written. */
  outDir: string;
  /** Prefix applied to generated CSS custom properties (`--mp-*`). Defaults to `'mp'`. */
  prefix?: string;
}

/** How a DTCG source is rendered to SCSS. */
type SourceKind = 'structural' | 'typography' | 'theme';

/** A single DTCG source file and how its SCSS is rendered. */
interface SourceDescriptor {
  /** Source/output base name (without extension), e.g. `'border-width'`. */
  file: string;
  /** SCSS rendering strategy for this source. */
  kind: SourceKind;
}

/**
 * The DTCG sources, in the order they are read. The structural scales and the
 * colour palette become self-contained SCSS partials (`$`-vars + `:root { --mp-* }`
 * + `@property`); the composite typography is flattened to per-field tokens and
 * emitted through the same structural path; the two themes are merged into a
 * single `light-dark()` partial.
 */
function sourceDescriptors(): SourceDescriptor[] {
  return [
    { file: 'border-width', kind: 'structural' },
    { file: 'breakpoint', kind: 'structural' },
    { file: 'font', kind: 'structural' },
    { file: 'motion', kind: 'structural' },
    { file: 'opacity', kind: 'structural' },
    { file: 'palette', kind: 'structural' },
    { file: 'radius', kind: 'structural' },
    { file: 'shadow', kind: 'structural' },
    { file: 'size', kind: 'structural' },
    { file: 'spacing', kind: 'structural' },
    { file: 'z-index', kind: 'structural' },
    { file: 'typography', kind: 'typography' },
    { file: 'theme-light', kind: 'theme' },
    { file: 'theme-dark', kind: 'theme' },
  ];
}

/**
 * Context shared by {@link writeSourceArtefacts} for a single DTCG source: the
 * output directories, the CSS-property prefix, and the alias source documents.
 */
interface EmitContext {
  scssDirectory: string;
  tsDirectory: string;
  prefix: string;
  fontDocument?: DtcgGroup;
  paletteDocument?: DtcgGroup;
}

/**
 * The alias source document for a TS module: the composite typography resolves
 * its `{font.*}` aliases against the `font` document, the themes resolve their
 * semantic `{color.*}` aliases against the `palette` document, and everything
 * else has no aliases to resolve.
 */
function aliasDocumentFor(descriptor: SourceDescriptor, context: EmitContext): DtcgGroup | undefined {
  switch (descriptor.kind) {
    case 'typography': {
      return context.fontDocument;
    }
    case 'theme': {
      return context.paletteDocument;
    }
    default: {
      return undefined;
    }
  }
}

/**
 * Write the SCSS (non-theme sources) and TypeScript artefacts for a single DTCG
 * source. SCSS partials use the leading-underscore convention (`_<file>.scss`);
 * each non-theme source also yields a CSS-free `_<file>-vars.scss` (the
 * `$`-variables only). Theme SCSS is emitted once by the caller, after the loop.
 */
function writeSourceArtefacts(descriptor: SourceDescriptor, document_: DtcgGroup, context: EmitContext): void {
  const { scssDirectory, tsDirectory, prefix } = context;
  if (descriptor.kind === 'structural' || descriptor.kind === 'typography') {
    const records =
      descriptor.kind === 'typography'
        ? buildTypographyRecords(document_.typography as DtcgGroup, prefix)
        : flattenTokens(document_);
    writeFileSync(join(scssDirectory, `_${descriptor.file}-vars.scss`), buildScssVariablesScss(records));
    writeFileSync(
      join(scssDirectory, `_${descriptor.file}.scss`),
      buildStructuralScss(records, prefix, descriptor.file),
    );
  }
  writeFileSync(
    join(tsDirectory, `${descriptor.file}.ts`),
    buildTokenModule(descriptor.file, document_, aliasDocumentFor(descriptor, context)),
  );
}

/**
 * Generate every consumable token artefact from the DTCG sources:
 *   • `scss/_<file>.scss`  — one self-contained SCSS partial per non-theme source
 *   • `scss/_theme.scss`   — the combined `light-dark()` theme partial
 *   • `ts/<file>.ts`       — one nested `as const` TypeScript module per source
 *   • `_tokens.scss`       — SCSS barrel `@forward`ing every partial (incl. theme)
 *   • `tokens.ts`          — TypeScript barrel re-exporting every per-file module
 *
 * Everything is produced by the custom emitters; there is no external CLI.
 */
export function generateTokens(options: TokensPluginOptions): void {
  const { tokensDir, outDir: outDirectory, prefix = 'mp' } = options;

  const descriptors = sourceDescriptors();

  const scssDirectory = join(outDirectory, 'scss');
  const tsDirectory = join(outDirectory, 'ts');
  mkdirSync(scssDirectory, { recursive: true });
  mkdirSync(tsDirectory, { recursive: true });

  /** Read and parse a DTCG `<file>.tokens.json` source from {@link tokensDir}. */
  const read = (file: string): DtcgGroup =>
    JSON.parse(readFileSync(join(tokensDir, `${file}.tokens.json`), 'utf8')) as DtcgGroup;

  // Parse every DTCG source once. The font document is the alias source for the
  // composite typography TS module; the palette document is the alias source for
  // the theme TS modules (their semantic `$value`s are palette aliases).
  const documents = new Map<string, DtcgGroup>(descriptors.map(({ file }) => [file, read(file)]));
  const fontDocument = documents.get('font');
  const paletteDocument = documents.get('palette');

  // The `@forward`/`@use` references omit the partial's leading underscore, as
  // Sass resolves a partial from its unprefixed name.
  const context: EmitContext = { scssDirectory, tsDirectory, prefix, fontDocument, paletteDocument };
  for (const descriptor of descriptors) {
    writeSourceArtefacts(descriptor, documents.get(descriptor.file) as DtcgGroup, context);
  }

  // Combined theme partial — `:root { color-scheme: light dark; --mp-color-*:
  // light-dark(<light>, <dark>); }`, with each value resolving to a palette
  // custom property.
  writeFileSync(
    join(scssDirectory, '_theme.scss'),
    buildLightDarkThemeScss(
      documents.get('theme-light') as DtcgGroup,
      documents.get('theme-dark') as DtcgGroup,
      prefix,
    ),
  );

  // SCSS barrel — `@forward` every partial so a single `@use 'generated/tokens'`
  // emits the structural + palette + typography custom properties (with their
  // `@property` registrations), re-exports the `$`-variables, and applies the
  // `light-dark()` theme.
  const forwarded = [
    ...descriptors.filter((descriptor) => descriptor.kind !== 'theme').map((descriptor) => descriptor.file),
    'theme',
  ];
  const barrel = `@charset "UTF-8";

// Generated by @mission-platform/vite-plugin-tokens from the DTCG sources in tokens/.
// Do not edit manually — edit tokens/*.tokens.json.

${forwarded
  .toSorted()
  .map((file) => `@forward 'scss/${file}';`)
  .join('\n')}
`;
  writeFileSync(join(outDirectory, '_tokens.scss'), barrel);

  // TypeScript barrel — pure re-export of every per-file module.
  writeFileSync(join(outDirectory, 'tokens.ts'), buildBarrelModule(descriptors.map((descriptor) => descriptor.file)));
}
