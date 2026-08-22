import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { camelCase, dashedName, deepMergeTokens, type DtcgGroup, flattenTokens } from './dtcg.js';
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
  /** Absolute path to a directory containing per-app token overrides. */
  overridesDir?: string;
  /** Manual per-app token overrides to merge over the platform defaults. */
  overrides?: Record<string, DtcgGroup>;
  /** Prefix applied to generated CSS custom properties (`--mp-*`). Defaults to `'mp'`. */
  prefix?: string;
}

/** How a DTCG source is rendered to SCSS. */
type SourceKind = 'structural' | 'typography' | 'component' | 'theme';

/** A single DTCG source file and how its SCSS is rendered. */
interface SourceDescriptor {
  /** Stable source identifier relative to the token directory. */
  sourceId: string;
  /** Generated path relative to `scss/` and `ts/`, without an extension. */
  outputPath: string;
  /** Source/output base name (without extension), e.g. `'border-width'`. */
  file: string;
  /** SCSS rendering strategy for this source. */
  kind: SourceKind;
  /** CSS namespace projected from the first layer under `component`. */
  cssNamespace?: string;
}

/**
 * The DTCG sources, in the order they are read. The structural scales and the
 * colour palette become self-contained SCSS partials (`$`-vars + `:root { --mp-* }`
 * + `@property`); the composite typography is flattened to per-field tokens and
 * emitted through the same structural path; the two themes are merged into a
 * single `light-dark()` partial.
 */
function sourceDescriptors(tokensDirectory: string): SourceDescriptor[] {
  const fixed = [
    'border-width',
    'breakpoint',
    'font',
    'motion',
    'opacity',
    'palette',
    'radius',
    'shadow',
    'size',
    'spacing',
    'z-index',
    'typography',
  ].map((file): SourceDescriptor => ({
    sourceId: file,
    outputPath: file,
    file,
    kind: file === 'typography' ? 'typography' : 'structural',
  }));

  const componentRoot = join(tokensDirectory, 'component');
  const componentFiles: string[] = [];
  function visit(directory: string): void {
    if (!existsSync(directory)) return;
    for (const entry of readdirSync(directory, { withFileTypes: true }).toSorted((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const entryPath = join(directory, entry.name);
      if (entry.isDirectory()) visit(entryPath);
      else if (entry.isFile() && entry.name.endsWith('.tokens.json')) componentFiles.push(entryPath);
    }
  }
  visit(componentRoot);
  const components = componentFiles.map((filePath): SourceDescriptor => {
    const outputPath = path
      .relative(tokensDirectory, filePath)
      .replaceAll('\\', '/')
      .replace(/\.tokens\.json$/, '');
    const file = path.basename(outputPath);
    return { sourceId: outputPath, outputPath, file, kind: 'component' };
  });
  if (components.length === 0 && existsSync(join(tokensDirectory, 'component.tokens.json'))) {
    components.push({ sourceId: 'component', outputPath: 'component', file: 'component', kind: 'component' });
  }

  return [
    ...fixed,
    ...components,
    { sourceId: 'theme-light', outputPath: 'theme-light', file: 'theme-light', kind: 'theme' },
    { sourceId: 'theme-dark', outputPath: 'theme-dark', file: 'theme-dark', kind: 'theme' },
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
  spacingDocument?: DtcgGroup;
  paletteDocument?: DtcgGroup;
  componentAliasDocument?: DtcgGroup;
  componentNamespaces: ReadonlySet<string>;
}

/**
 * The alias source document for a TS module: the composite typography resolves
 * its `{font.*}` and `{spacing.*}` aliases against the merged `font` + `spacing`
 * documents (their top-level groups — `font`/`line-height`/`letter-spacing` vs
 * `spacing` — don't collide), the themes resolve their semantic `{color.*}`
 * aliases against the `palette` document, and component aliases against the
 * merged component alias document. Structural sources have no aliases to
 * resolve.
 */
function aliasDocumentFor(descriptor: SourceDescriptor, context: EmitContext): DtcgGroup | undefined {
  switch (descriptor.kind) {
    case 'typography': {
      return { ...context.fontDocument, ...context.spacingDocument };
    }
    case 'theme': {
      return context.paletteDocument;
    }
    case 'component': {
      return context.componentAliasDocument;
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
function componentRecords(document_: DtcgGroup, cssNamespace: string) {
  return flattenTokens(document_).map((record) => ({
    ...record,
    path: [cssNamespace, ...record.path.slice(2)],
    group: cssNamespace,
  }));
}

function writeSourceArtefacts(
  descriptor: SourceDescriptor,
  document_: DtcgGroup,
  context: EmitContext,
  exportName: string,
): void {
  const { scssDirectory, tsDirectory, prefix } = context;
  if (descriptor.kind === 'structural' || descriptor.kind === 'typography' || descriptor.kind === 'component') {
    const records =
      descriptor.kind === 'typography'
        ? buildTypographyRecords(document_.typography as DtcgGroup, prefix)
        : descriptor.kind === 'component'
          ? componentRecords(document_, descriptor.cssNamespace as string)
          : flattenTokens(document_);
    const outputDirectory = join(scssDirectory, path.dirname(descriptor.outputPath));
    const outputFile = path.basename(descriptor.outputPath);
    mkdirSync(outputDirectory, { recursive: true });
    writeFileSync(
      join(outputDirectory, `_${outputFile}-vars.scss`),
      buildScssVariablesScss(records, prefix, descriptor.cssNamespace, context.componentNamespaces),
    );
    writeFileSync(
      join(outputDirectory, `_${outputFile}.scss`),
      buildStructuralScss(records, prefix, outputFile, descriptor.cssNamespace),
    );
  }
  const outputDirectory = join(tsDirectory, path.dirname(descriptor.outputPath));
  mkdirSync(outputDirectory, { recursive: true });
  writeFileSync(
    join(outputDirectory, `${path.basename(descriptor.outputPath)}.ts`),
    buildTokenModule(descriptor.file, document_, aliasDocumentFor(descriptor, context), exportName),
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
  const { tokensDir, outDir: outDirectory, overridesDir, overrides, prefix = 'mp' } = options;

  const descriptors = sourceDescriptors(tokensDir);

  const scssDirectory = join(outDirectory, 'scss');
  const tsDirectory = join(outDirectory, 'ts');
  rmSync(scssDirectory, { force: true, recursive: true });
  rmSync(tsDirectory, { force: true, recursive: true });
  mkdirSync(scssDirectory, { recursive: true });
  mkdirSync(tsDirectory, { recursive: true });

  const componentNamespace = (document_: DtcgGroup): string => {
    const component = document_.component;
    if (typeof component !== 'object' || component === null) {
      throw new Error('Component token source must contain a component group.');
    }
    const layers = Object.keys(component as DtcgGroup).filter((key) => !key.startsWith('$'));
    if (layers.length !== 1) {
      throw new Error(`Component token source must own exactly one layer; found ${layers.join(', ') || 'none'}.`);
    }
    return layers[0];
  };

  const componentOverride = (override: DtcgGroup, namespace: string): DtcgGroup => {
    const component = override.component;
    if (typeof component !== 'object' || component === null) return override;
    const layer = (component as DtcgGroup)[namespace];
    return layer === undefined ? {} : { component: { [namespace]: layer } };
  };

  /** Read and parse a DTCG `<file>.tokens.json` source, merging overrides. */
  const read = (descriptor: SourceDescriptor): DtcgGroup => {
    const basePath = join(tokensDir, `${descriptor.sourceId}.tokens.json`);
    const base = JSON.parse(readFileSync(basePath, 'utf8')) as DtcgGroup;
    let merged = base;
    const namespace = descriptor.kind === 'component' ? componentNamespace(base) : undefined;

    if (overridesDir) {
      const sourceOverridePath = join(overridesDir, `${descriptor.sourceId}.tokens.json`);
      if (existsSync(sourceOverridePath)) {
        merged = deepMergeTokens(merged, JSON.parse(readFileSync(sourceOverridePath, 'utf8')) as DtcgGroup);
      }
      if (descriptor.kind === 'component') {
        const legacyOverridePath = join(overridesDir, 'component.tokens.json');
        if (existsSync(legacyOverridePath)) {
          const legacy = JSON.parse(readFileSync(legacyOverridePath, 'utf8')) as DtcgGroup;
          merged = deepMergeTokens(merged, componentOverride(legacy, namespace as string));
        }
      }
    }

    const sourceOverride = overrides?.[descriptor.sourceId] ?? overrides?.[descriptor.file];
    if (sourceOverride) merged = deepMergeTokens(merged, sourceOverride);
    if (descriptor.kind === 'component' && overrides?.component) {
      merged = deepMergeTokens(merged, componentOverride(overrides.component, namespace as string));
    }

    return merged;
  };

  // Parse every DTCG source once. The font + spacing documents are the alias
  // source for the composite typography TS module (font primitives + the
  // logical-margin spacing steps); the palette document is the alias source for
  // the theme TS modules (their semantic `$value`s are palette aliases).
  const documents = new Map<string, DtcgGroup>(
    descriptors.map((descriptor) => [descriptor.sourceId, read(descriptor)]),
  );
  const namespaces = new Set<string>();
  const reservedNames = new Map<string, unknown>();
  const reserve = (records: ReturnType<typeof flattenTokens>): void => {
    for (const record of records) reservedNames.set(dashedName(record), record.value);
  };
  for (const descriptor of descriptors.filter(({ kind }) => kind === 'structural' || kind === 'typography')) {
    reserve(
      descriptor.kind === 'typography'
        ? buildTypographyRecords((documents.get(descriptor.sourceId) as DtcgGroup).typography as DtcgGroup, prefix)
        : flattenTokens(documents.get(descriptor.sourceId) as DtcgGroup),
    );
  }
  const lightTheme = descriptors.find(({ sourceId }) => sourceId === 'theme-light');
  if (lightTheme) reserve(flattenTokens(documents.get(lightTheme.sourceId) as DtcgGroup));
  for (const descriptor of descriptors.filter(({ kind }) => kind === 'component')) {
    const document_ = documents.get(descriptor.sourceId) as DtcgGroup;
    const namespace = componentNamespace(document_);
    if (namespaces.has(namespace)) throw new Error(`Duplicate component CSS namespace: ${namespace}`);
    for (const record of componentRecords(document_, namespace)) {
      const name = dashedName(record);
      const reservedValue = reservedNames.get(name);
      if (reservedValue !== undefined && JSON.stringify(reservedValue) !== JSON.stringify(record.value)) {
        throw new Error(`Component CSS property collides with a primitive property: ${name}`);
      }
    }
    descriptor.cssNamespace = namespace;
    namespaces.add(namespace);
  }
  const fontDocument = documents.get('font');
  const spacingDocument = documents.get('spacing');
  const paletteDocument = documents.get('palette');
  // Component aliases refer to semantic theme tokens (`color.*`) as well as
  // primitive scales. Merge palette first so the light semantic theme can
  // intentionally take precedence over the palette's same-named groups.
  const componentAliasDescriptors: SourceDescriptor[] = [
    ...descriptors.filter(({ kind }) => kind !== 'theme'),
    descriptors.find(({ sourceId }) => sourceId === 'theme-light') as SourceDescriptor,
  ];
  let componentAliasDocument: DtcgGroup = {};
  for (const { sourceId } of componentAliasDescriptors) {
    componentAliasDocument = deepMergeTokens(componentAliasDocument, documents.get(sourceId) as DtcgGroup);
  }

  // The `@forward`/`@use` references omit the partial's leading underscore, as
  // Sass resolves a partial from its unprefixed name.
  const context: EmitContext = {
    scssDirectory,
    tsDirectory,
    prefix,
    fontDocument,
    spacingDocument,
    paletteDocument,
    componentAliasDocument,
    componentNamespaces: namespaces,
  };
  const basenameCounts = new Map<string, number>();
  for (const descriptor of descriptors)
    basenameCounts.set(descriptor.file, (basenameCounts.get(descriptor.file) ?? 0) + 1);
  const exportNameFor = (descriptor: SourceDescriptor): string =>
    basenameCounts.get(descriptor.file) === 1
      ? camelCase(descriptor.file)
      : camelCase(descriptor.sourceId.replaceAll('/', '-'));
  for (const descriptor of descriptors) {
    writeSourceArtefacts(
      descriptor,
      documents.get(descriptor.sourceId) as DtcgGroup,
      context,
      exportNameFor(descriptor),
    );
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
    ...descriptors.filter((descriptor) => descriptor.kind !== 'theme').map((descriptor) => descriptor.outputPath),
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
  writeFileSync(
    join(outDirectory, 'tokens.ts'),
    buildBarrelModule(
      descriptors.map((descriptor) => ({ outputPath: descriptor.outputPath, exportName: exportNameFor(descriptor) })),
    ),
  );
}
