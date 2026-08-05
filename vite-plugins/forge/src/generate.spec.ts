import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { generateEntry, generateFrameworkSources, jsxComponentsCssImportPlugin } from './generate';

import type { DiscoveredComponent, DiscoveredHelperExport } from './compiler/discover';

/**
 * Minimal stand-in for a Rollup output chunk, carrying only the fields the
 * plugin reads (`type`, `fileName`, `code`, `viteMetadata.importedCss`).
 */
function chunk(fileName: string, code: string, importedCss?: string[]): Record<string, unknown> {
  return {
    type: 'chunk',
    fileName,
    code,
    viteMetadata: { importedCss: new Set(importedCss) },
  };
}

/**
 * Minimal stand-in for an emitted CSS asset. The plugin only re-links CSS names
 * that are present in the bundle as an emitted asset, so tests exercising the
 * happy path must include the asset the chunk owns.
 */
function asset(fileName: string): Record<string, unknown> {
  return { type: 'asset', fileName, source: '' };
}

/**
 * Invoke the plugin's `generateBundle` hook (a plain function) over `bundle`.
 *
 * A minimal plugin context is supplied so `this.emitFile` works: the plugin adds
 * the renamed (plain `.css`) stylesheet through it, mirroring how Rollup/Rolldown
 * register a new emitted asset (which is why directly assigning a fresh bundle
 * key is not honoured by the writer). The stub records those emissions back into
 * `bundle` so assertions can observe the renamed asset.
 */
function runGenerateBundle(bundle: Record<string, Record<string, unknown>>): void {
  const plugin = jsxComponentsCssImportPlugin();
  const hook = plugin.generateBundle;
  if (typeof hook !== 'function') {
    throw new TypeError('expected a function generateBundle hook');
  }
  const context = {
    emitFile(emitted: { type: string; fileName?: string; source?: unknown }): string {
      if (emitted.type === 'asset' && emitted.fileName !== undefined) {
        bundle[emitted.fileName] = { type: 'asset', fileName: emitted.fileName, source: emitted.source };
      }
      return 'ref';
    },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (hook as any).call(context, {}, bundle);
}

/** Build a `DiscoveredComponent` with sensible defaults for the entry tests. */
function component(
  overrides: Partial<DiscoveredComponent> & Pick<DiscoveredComponent, 'neutralName'>,
): DiscoveredComponent {
  const neutralName = overrides.neutralName;
  const publicName = overrides.publicName ?? neutralName.replace(/^Forge/, '');
  const folder = overrides.folder ?? `forge-${publicName.toLowerCase()}`;
  return {
    neutralName,
    publicName,
    propertiesType: overrides.propertiesType,
    typeExports: overrides.typeExports ?? [],
    folder,
    sourceDir: overrides.sourceDir ?? folder,
  };
}

/** Minimal atom used by the nested/flat generate parity fixtures. */
const TYPOGRAPHY_SOURCE = [
  "import { h, type MpElement, type MpProperties } from '@mission-platform/forge';",
  '',
  'export type TypographyVariant = "body" | "caption";',
  '',
  'export interface TypographyProperties extends MpProperties {',
  '  variant?: TypographyVariant;',
  '}',
  '',
  'export function ForgeTypography(properties: TypographyProperties): MpElement {',
  '  return <span data-variant={properties.variant ?? "body"} />;',
  '}',
  '',
].join('\n');

/** Molecule that imports the typography atom via a relative sibling specifier. */
function quoteSource(typographyImport: string): string {
  return [
    "import { h, type MpElement, type MpProperties } from '@mission-platform/forge';",
    '',
    `import { ForgeTypography, type TypographyVariant } from '${typographyImport}';`,
    '',
    'export interface QuoteProperties extends MpProperties {',
    '  variant?: TypographyVariant;',
    '}',
    '',
    'export function ForgeQuote(properties: QuoteProperties): MpElement {',
    '  return <ForgeTypography variant={properties.variant}>{/* quote */}</ForgeTypography>;',
    '}',
    '',
  ].join('\n');
}

describe('generateFrameworkSources', () => {
  it('carries locale type declarations into the generated tree', () => {
    const packageDir = mkdtempSync(path.join(os.tmpdir(), 'mp-jsx-generate-'));
    const componentsDir = path.join(packageDir, 'src', 'components');
    const componentDir = path.join(componentsDir, 'forge-badge');
    const localesDir = path.join(packageDir, 'src', 'locales');
    const outDir = path.join(packageDir, 'generated', 'vue');

    try {
      mkdirSync(componentDir, { recursive: true });
      mkdirSync(localesDir, { recursive: true });
      writeFileSync(path.join(componentsDir, 'index.ts'), "export { ForgeBadge } from './forge-badge';\n");
      writeFileSync(
        path.join(componentDir, 'forge-badge.tsx'),
        'export function ForgeBadge(): null { return null; }\n',
      );
      writeFileSync(path.join(localesDir, 'types.d.ts'), "declare module 'i18next' {}\n");

      generateFrameworkSources({ framework: 'vue', componentsModule: path.join(componentsDir, 'index.ts'), outDir });

      expect(readFileSync(path.join(outDir, 'locales', 'types.d.ts'), 'utf8')).toBe("declare module 'i18next' {}\n");
    } finally {
      rmSync(packageDir, { recursive: true, force: true });
    }
  });

  it('mirrors nested atomic-design source dirs in the generated cache tree', () => {
    const packageDir = mkdtempSync(path.join(os.tmpdir(), 'mp-jsx-generate-nested-'));
    const flatComponentsDir = path.join(packageDir, 'flat', 'src', 'components');
    const nestedComponentsDir = path.join(packageDir, 'nested', 'src', 'components');
    const flatOutDir = path.join(packageDir, 'flat', 'generated', 'vue');
    const nestedOutDir = path.join(packageDir, 'nested', 'generated', 'vue');

    try {
      // Flat layout: src/components/<folder>/<folder>.tsx
      const flatTypographyDir = path.join(flatComponentsDir, 'forge-typography');
      const flatQuoteDir = path.join(flatComponentsDir, 'forge-quote');
      mkdirSync(flatTypographyDir, { recursive: true });
      mkdirSync(flatQuoteDir, { recursive: true });
      writeFileSync(
        path.join(flatComponentsDir, 'index.ts'),
        [
          "export { ForgeTypography, type TypographyProperties, type TypographyVariant } from './forge-typography';",
          "export { ForgeQuote, type QuoteProperties } from './forge-quote';",
          '',
        ].join('\n'),
      );
      writeFileSync(path.join(flatTypographyDir, 'forge-typography.tsx'), TYPOGRAPHY_SOURCE);
      writeFileSync(path.join(flatQuoteDir, 'forge-quote.tsx'), quoteSource('../forge-typography'));

      // Nested atomic-design layout: src/components/<level>/<folder>/<folder>.tsx
      const nestedTypographyDir = path.join(nestedComponentsDir, 'atoms', 'forge-typography');
      const nestedQuoteDir = path.join(nestedComponentsDir, 'molecules', 'forge-quote');
      mkdirSync(nestedTypographyDir, { recursive: true });
      mkdirSync(nestedQuoteDir, { recursive: true });
      writeFileSync(
        path.join(nestedComponentsDir, 'index.ts'),
        [
          "export { ForgeTypography, type TypographyProperties, type TypographyVariant } from './atoms/forge-typography';",
          "export { ForgeQuote, type QuoteProperties } from './molecules/forge-quote';",
          '',
        ].join('\n'),
      );
      writeFileSync(path.join(nestedTypographyDir, 'forge-typography.tsx'), TYPOGRAPHY_SOURCE);
      // A molecule importing an atom climbs two levels then into the atoms folder.
      writeFileSync(path.join(nestedQuoteDir, 'forge-quote.tsx'), quoteSource('../../atoms/forge-typography'));

      generateFrameworkSources({
        framework: 'vue',
        componentsModule: path.join(flatComponentsDir, 'index.ts'),
        outDir: flatOutDir,
      });
      generateFrameworkSources({
        framework: 'vue',
        componentsModule: path.join(nestedComponentsDir, 'index.ts'),
        outDir: nestedOutDir,
      });

      // Flat layout: each component lives under its own folder in the cache tree,
      // and a sibling import resolves through that folder.
      const flatQuote = readFileSync(path.join(flatOutDir, 'forge-quote', 'forge-quote.vue'), 'utf8');
      expect(flatQuote).toContain("import ForgeTypography from '../forge-typography/forge-typography.vue';");
      const flatEntry = readFileSync(path.join(flatOutDir, 'index.ts'), 'utf8');
      expect(flatEntry).toContain("export { default as Typography } from './forge-typography/forge-typography.vue';");
      expect(flatEntry).toContain("export { default as Quote } from './forge-quote/forge-quote.vue';");

      // Nested atomic-design layout is preserved verbatim in the cache tree.
      const nestedQuote = readFileSync(path.join(nestedOutDir, 'molecules', 'forge-quote', 'forge-quote.vue'), 'utf8');
      // The molecule → atom sibling import climbs to the atoms folder in the mirror.
      expect(nestedQuote).toContain("import ForgeTypography from '../../atoms/forge-typography/forge-typography.vue';");
      expect(nestedQuote).toContain(
        "import type { TypographyVariant } from '../../atoms/forge-typography/forge-typography.vue';",
      );

      const nestedEntry = readFileSync(path.join(nestedOutDir, 'index.ts'), 'utf8');
      expect(nestedEntry).toContain(
        "export { default as Typography } from './atoms/forge-typography/forge-typography.vue';",
      );
      expect(nestedEntry).toContain("export { default as Quote } from './molecules/forge-quote/forge-quote.vue';");
    } finally {
      rmSync(packageDir, { recursive: true, force: true });
    }
  });

  it('mirrors a co-located helper alongside its nested component in the cache tree', () => {
    const packageDir = mkdtempSync(path.join(os.tmpdir(), 'mp-jsx-generate-nested-helper-'));
    const componentsDir = path.join(packageDir, 'src', 'components');
    const componentDir = path.join(componentsDir, 'molecules', 'forge-counter');
    const outDir = path.join(packageDir, 'generated', 'vue');

    try {
      mkdirSync(componentDir, { recursive: true });
      writeFileSync(
        path.join(componentsDir, 'index.ts'),
        "export { ForgeCounter } from './molecules/forge-counter';\n",
      );
      writeFileSync(
        path.join(componentDir, 'counter-store.ts'),
        ['export function getCount(): number {', '  return 0;', '}', ''].join('\n'),
      );
      writeFileSync(
        path.join(componentDir, 'forge-counter.tsx'),
        [
          "import { h, type MpElement, type MpProperties } from '@mission-platform/forge';",
          '',
          "import { getCount } from './counter-store';",
          '',
          'export function ForgeCounter(_properties: MpProperties): MpElement {',
          '  return <span>{getCount()}</span>;',
          '}',
          '',
        ].join('\n'),
      );

      generateFrameworkSources({ framework: 'vue', componentsModule: path.join(componentsDir, 'index.ts'), outDir });

      // The component and its co-located helper both live under the mirrored
      // `molecules/forge-counter/` directory, so the helper import stays local.
      expect(readFileSync(path.join(outDir, 'molecules', 'forge-counter', 'forge-counter.vue'), 'utf8')).toContain(
        "import { getCount } from './counter-store';",
      );
      expect(readFileSync(path.join(outDir, 'molecules', 'forge-counter', 'counter-store.ts'), 'utf8')).toContain(
        'export function getCount',
      );
      expect(readFileSync(path.join(outDir, 'index.ts'), 'utf8')).toContain(
        "export { default as Counter } from './molecules/forge-counter/forge-counter.vue';",
      );
    } finally {
      rmSync(packageDir, { recursive: true, force: true });
    }
  });
});

describe('generateEntry', () => {
  it('re-exports each component under both its public and neutral names', () => {
    const entry = generateEntry('react', [component({ neutralName: 'ForgeBadge', folder: 'forge-badge' })]);

    expect(entry).toContain("export { ForgeBadge as Badge } from './forge-badge';");
    expect(entry).toContain("export { ForgeBadge as ForgeBadge } from './forge-badge';");
  });

  it('re-exports every companion type a component ships, from the React `.tsx` module (type-only)', () => {
    const entry = generateEntry('react', [
      component({
        neutralName: 'ForgeBadge',
        folder: 'forge-badge',
        typeExports: ['BadgeVariant', 'BadgeProperties'],
      }),
    ]);

    // The companion types are surfaced from the same module as the component,
    // as a single type-only re-export line — so the `tsc`-emitted `index.d.ts`
    // (compiled from this entry) carries the full public surface.
    expect(entry).toContain("export { type BadgeVariant, type BadgeProperties } from './forge-badge';");
  });

  it('re-exports companion types from the Vue `.vue` module', () => {
    const entry = generateEntry('vue', [
      component({
        neutralName: 'ForgeBadge',
        folder: 'forge-badge',
        typeExports: ['BadgeVariant', 'BadgeProperties'],
      }),
    ]);

    expect(entry).toContain("export { default as Badge } from './forge-badge.vue';");
    expect(entry).toContain("export { type BadgeVariant, type BadgeProperties } from './forge-badge.vue';");
  });

  it('emits a single, unioned type re-export for multiple components sharing one folder', () => {
    // Two component values re-exported from the same barrel statement share the
    // folder and the type set, so the entry must emit exactly one type line for
    // them (a duplicated re-export would be a compile error).
    const entry = generateEntry('react', [
      component({ neutralName: 'ForgeRadio', folder: 'forge-radio', typeExports: ['RadioProperties', 'RadioSize'] }),
      component({
        neutralName: 'ForgeRadioGroup',
        folder: 'forge-radio',
        typeExports: ['RadioProperties', 'RadioSize'],
      }),
    ]);

    const typeLines = entry.split('\n').filter((line) => line.includes('type RadioProperties'));
    expect(typeLines).toHaveLength(1);
    expect(typeLines[0]).toBe("export { type RadioProperties, type RadioSize } from './forge-radio';");
  });

  it('omits a type re-export line for components that ship no companion types', () => {
    const entry = generateEntry('react', [component({ neutralName: 'ForgeGrid', folder: 'forge-grid' })]);

    expect(entry).not.toContain('export { type');
  });

  it('re-exports a type from the resolved helper module when it is declared there, not the component', () => {
    // `DateRange` is re-exported alongside the component in the barrel but is
    // actually declared in the copied `date-time` helper, so the resolver points
    // the re-export at `./date-time` — avoiding a dangling `./forge-…` re-export.
    const entry = generateEntry(
      'react',
      [
        component({
          neutralName: 'ForgeDateRangeInput',
          folder: 'forge-date-range-input',
          typeExports: ['DateRange', 'DateRangeInputProperties'],
        }),
      ],
      [],
      (_folder, typeName) =>
        typeName === 'DateRange'
          ? { base: 'date-time', isComponent: false }
          : { base: 'forge-date-range-input', isComponent: true },
    );

    expect(entry).toContain("export { type DateRange } from './date-time';");
    expect(entry).toContain("export { type DateRangeInputProperties } from './forge-date-range-input';");
  });

  it('re-exports a helper-declared type without the `.vue` suffix on the Vue target', () => {
    const entry = generateEntry(
      'vue',
      [component({ neutralName: 'ForgeDateRangeInput', folder: 'forge-date-range-input', typeExports: ['DateRange'] })],
      [],
      () => ({ base: 'date-time', isComponent: false }),
    );

    // A helper module is a plain `.ts`, so it is re-exported as `./date-time`
    // (no `.vue`), unlike a component module which is `./forge-….vue`.
    expect(entry).toContain("export { type DateRange } from './date-time';");
    expect(entry).not.toContain('date-time.vue');
  });

  it('skips a companion type the resolver cannot place (never emits a broken re-export)', () => {
    const entry = generateEntry(
      'react',
      [
        component({
          neutralName: 'ForgeBadge',
          folder: 'forge-badge',
          typeExports: ['BadgeProperties', 'PhantomType'],
        }),
      ],
      [],
      (_folder, typeName) => (typeName === 'PhantomType' ? undefined : { base: 'forge-badge', isComponent: true }),
    );

    expect(entry).toContain("export { type BadgeProperties } from './forge-badge';");
    expect(entry).not.toContain('PhantomType');
  });

  it('forwards shared helper-module APIs after the component + type re-exports', () => {
    const helper: DiscoveredHelperExport = {
      base: 'toast-store',
      relativePath: 'toast-store',
      values: ['useToast', 'showToast'],
      types: ['ToastOptions'],
    };
    const entry = generateEntry(
      'react',
      [component({ neutralName: 'ForgeToast', folder: 'forge-toast', typeExports: ['ToastProperties'] })],
      [helper],
    );

    expect(entry).toContain("export { useToast, showToast, type ToastOptions } from './toast-store';");
  });
});

describe('jsxComponentsCssImportPlugin', () => {
  it('runs after Vite so `importedCss` is already populated', () => {
    // The whole bug was the hook firing before Vite filled `importedCss`; the
    // `post` enforcement is what guarantees the metadata is present.
    expect(jsxComponentsCssImportPlugin().enforce).toBe('post');
  });

  it('prepends a relative side-effect import for each CSS file a chunk owns', () => {
    const cssName = 'forge-badge.vue_vue_type_style_index_0_scoped_88cf7452_lang.css';
    const bundle = {
      'forge-badge.js': chunk('forge-badge.js', 'export { n as default };', [cssName]),
      [cssName]: asset(cssName),
    };

    runGenerateBundle(bundle);

    expect(bundle['forge-badge.js'].code).toBe(
      'import "./forge-badge.vue_vue_type_style_index_0_scoped_88cf7452_lang.css";\nexport { n as default };',
    );
  });

  it('computes a relative specifier for nested chunks', () => {
    const bundle = {
      'nested/forge-badge.js': chunk('nested/forge-badge.js', 'code;', ['forge-badge.css']),
      'forge-badge.css': asset('forge-badge.css'),
    };

    runGenerateBundle(bundle);

    expect(bundle['nested/forge-badge.js'].code).toContain('import "../forge-badge.css";');
  });

  it('skips CSS names that were deduplicated away (not emitted into the bundle)', () => {
    // Under `preserveModules`, Vite lists a shared, byte-identical stylesheet in
    // every importer's `importedCss` but emits it only once (under one chunk's
    // name), dropping the duplicates. Re-linking a dropped name would produce a
    // dangling import that breaks consumer builds, so it must be skipped.
    const emitted = 'forge-card.vue_vue_type_style_index_0_lang.css';
    const dropped = 'forge-button.vue_vue_type_style_index_0_lang.css';
    const bundle = {
      'forge-button.js': chunk('forge-button.js', 'export { b as default };', [dropped]),
      'forge-card.js': chunk('forge-card.js', 'export { c as default };', [emitted]),
      [emitted]: asset(emitted),
    };

    runGenerateBundle(bundle);

    // The dropped name is filtered out, leaving the chunk untouched...
    expect(bundle['forge-button.js'].code).toBe('export { b as default };');
    // ...while the retained, emitted stylesheet is still re-linked.
    expect(bundle['forge-card.js'].code).toBe(
      'import "./forge-card.vue_vue_type_style_index_0_lang.css";\nexport { c as default };',
    );
  });

  it('leaves chunks without associated CSS untouched (inline-styled components)', () => {
    const bundle = {
      'forge-grid.js': chunk('forge-grid.js', 'export { t as default };'),
    };

    runGenerateBundle(bundle);

    expect(bundle['forge-grid.js'].code).toBe('export { t as default };');
  });

  it('renames a `*.module.css` asset to a plain `*.css` and re-links its importer', () => {
    // A CSS Module's stylesheet is emitted under its source name with the class
    // hashing already baked into the sibling `.module.js` map. Keeping the
    // `.module.css` suffix makes a downstream bundler re-hash it (breaking the
    // class-name match), so it must ship as a plain, global `.css`.
    const bundle = {
      'map-libre.module.js': chunk('map-libre.module.js', 'export { e as default };', ['map-libre.module.css']),
      'map-libre.module.css': asset('map-libre.module.css'),
    };

    runGenerateBundle(bundle);

    // The stylesheet asset is renamed…
    expect(bundle['map-libre.module.css']).toBeUndefined();
    expect(bundle['map-libre.css']).toBeDefined();
    expect((bundle['map-libre.css'] as { fileName: string }).fileName).toBe('map-libre.css');
    // …and the re-linked import points at the renamed, plain `.css`.
    expect(bundle['map-libre.module.js'].code).toBe('import "./map-libre.css";\nexport { e as default };');
  });

  it('does not clobber a stylesheet that already ships under the plain `.css` name', () => {
    // If both `foo.module.css` and `foo.css` somehow exist, renaming would
    // overwrite the plain one; the module asset is left untouched instead.
    const bundle = {
      'foo.module.js': chunk('foo.module.js', 'code;', ['foo.module.css']),
      'foo.module.css': asset('foo.module.css'),
      'foo.css': asset('foo.css'),
    };

    runGenerateBundle(bundle);

    expect(bundle['foo.module.css']).toBeDefined();
    expect(bundle['foo.module.js'].code).toBe('import "./foo.module.css";\ncode;');
  });
});
