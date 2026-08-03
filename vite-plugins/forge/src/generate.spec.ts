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
  const publicName = overrides.publicName ?? neutralName.replace(/^Base/, '');
  return {
    neutralName,
    publicName,
    propertiesType: overrides.propertiesType,
    typeExports: overrides.typeExports ?? [],
    folder: overrides.folder ?? `base-${publicName.toLowerCase()}`,
  };
}

describe('generateFrameworkSources', () => {
  it('carries locale type declarations into the generated tree', () => {
    const packageDir = mkdtempSync(path.join(os.tmpdir(), 'mp-jsx-generate-'));
    const componentsDir = path.join(packageDir, 'src', 'components');
    const componentDir = path.join(componentsDir, 'base-badge');
    const localesDir = path.join(packageDir, 'src', 'locales');
    const outDir = path.join(packageDir, 'generated', 'vue');

    try {
      mkdirSync(componentDir, { recursive: true });
      mkdirSync(localesDir, { recursive: true });
      writeFileSync(path.join(componentsDir, 'index.ts'), "export { BaseBadge } from './base-badge';\n");
      writeFileSync(path.join(componentDir, 'base-badge.tsx'), 'export function BaseBadge(): null { return null; }\n');
      writeFileSync(path.join(localesDir, 'types.d.ts'), "declare module 'i18next' {}\n");

      generateFrameworkSources({ framework: 'vue', componentsModule: path.join(componentsDir, 'index.ts'), outDir });

      expect(readFileSync(path.join(outDir, 'locales', 'types.d.ts'), 'utf8')).toBe("declare module 'i18next' {}\n");
    } finally {
      rmSync(packageDir, { recursive: true, force: true });
    }
  });
});

describe('generateEntry', () => {
  it('re-exports each component under both its public and neutral names', () => {
    const entry = generateEntry('react', [component({ neutralName: 'BaseBadge', folder: 'base-badge' })]);

    expect(entry).toContain("export { BaseBadge as Badge } from './base-badge';");
    expect(entry).toContain("export { BaseBadge as BaseBadge } from './base-badge';");
  });

  it('re-exports every companion type a component ships, from the React `.tsx` module (type-only)', () => {
    const entry = generateEntry('react', [
      component({
        neutralName: 'BaseBadge',
        folder: 'base-badge',
        typeExports: ['BadgeVariant', 'BadgeProperties'],
      }),
    ]);

    // The companion types are surfaced from the same module as the component,
    // as a single type-only re-export line — so the `tsc`-emitted `index.d.ts`
    // (compiled from this entry) carries the full public surface.
    expect(entry).toContain("export { type BadgeVariant, type BadgeProperties } from './base-badge';");
  });

  it('re-exports companion types from the Vue `.vue` module', () => {
    const entry = generateEntry('vue', [
      component({
        neutralName: 'BaseBadge',
        folder: 'base-badge',
        typeExports: ['BadgeVariant', 'BadgeProperties'],
      }),
    ]);

    expect(entry).toContain("export { default as Badge } from './base-badge.vue';");
    expect(entry).toContain("export { type BadgeVariant, type BadgeProperties } from './base-badge.vue';");
  });

  it('emits a single, unioned type re-export for multiple components sharing one folder', () => {
    // Two component values re-exported from the same barrel statement share the
    // folder and the type set, so the entry must emit exactly one type line for
    // them (a duplicated re-export would be a compile error).
    const entry = generateEntry('react', [
      component({ neutralName: 'BaseRadio', folder: 'base-radio', typeExports: ['RadioProperties', 'RadioSize'] }),
      component({ neutralName: 'BaseRadioGroup', folder: 'base-radio', typeExports: ['RadioProperties', 'RadioSize'] }),
    ]);

    const typeLines = entry.split('\n').filter((line) => line.includes('type RadioProperties'));
    expect(typeLines).toHaveLength(1);
    expect(typeLines[0]).toBe("export { type RadioProperties, type RadioSize } from './base-radio';");
  });

  it('omits a type re-export line for components that ship no companion types', () => {
    const entry = generateEntry('react', [component({ neutralName: 'BaseGrid', folder: 'base-grid' })]);

    expect(entry).not.toContain('export { type');
  });

  it('re-exports a type from the resolved helper module when it is declared there, not the component', () => {
    // `DateRange` is re-exported alongside the component in the barrel but is
    // actually declared in the copied `date-time` helper, so the resolver points
    // the re-export at `./date-time` — avoiding a dangling `./base-…` re-export.
    const entry = generateEntry(
      'react',
      [
        component({
          neutralName: 'BaseDateRangeInput',
          folder: 'base-date-range-input',
          typeExports: ['DateRange', 'DateRangeInputProperties'],
        }),
      ],
      [],
      (_folder, typeName) =>
        typeName === 'DateRange'
          ? { base: 'date-time', isComponent: false }
          : { base: 'base-date-range-input', isComponent: true },
    );

    expect(entry).toContain("export { type DateRange } from './date-time';");
    expect(entry).toContain("export { type DateRangeInputProperties } from './base-date-range-input';");
  });

  it('re-exports a helper-declared type without the `.vue` suffix on the Vue target', () => {
    const entry = generateEntry(
      'vue',
      [component({ neutralName: 'BaseDateRangeInput', folder: 'base-date-range-input', typeExports: ['DateRange'] })],
      [],
      () => ({ base: 'date-time', isComponent: false }),
    );

    // A helper module is a plain `.ts`, so it is re-exported as `./date-time`
    // (no `.vue`), unlike a component module which is `./base-….vue`.
    expect(entry).toContain("export { type DateRange } from './date-time';");
    expect(entry).not.toContain('date-time.vue');
  });

  it('skips a companion type the resolver cannot place (never emits a broken re-export)', () => {
    const entry = generateEntry(
      'react',
      [component({ neutralName: 'BaseBadge', folder: 'base-badge', typeExports: ['BadgeProperties', 'PhantomType'] })],
      [],
      (_folder, typeName) => (typeName === 'PhantomType' ? undefined : { base: 'base-badge', isComponent: true }),
    );

    expect(entry).toContain("export { type BadgeProperties } from './base-badge';");
    expect(entry).not.toContain('PhantomType');
  });

  it('forwards shared helper-module APIs after the component + type re-exports', () => {
    const helper: DiscoveredHelperExport = {
      base: 'toast-store',
      values: ['useToast', 'showToast'],
      types: ['ToastOptions'],
    };
    const entry = generateEntry(
      'react',
      [component({ neutralName: 'BaseToast', folder: 'base-toast', typeExports: ['ToastProperties'] })],
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
    const cssName = 'base-badge.vue_vue_type_style_index_0_scoped_88cf7452_lang.css';
    const bundle = {
      'base-badge.js': chunk('base-badge.js', 'export { n as default };', [cssName]),
      [cssName]: asset(cssName),
    };

    runGenerateBundle(bundle);

    expect(bundle['base-badge.js'].code).toBe(
      'import "./base-badge.vue_vue_type_style_index_0_scoped_88cf7452_lang.css";\nexport { n as default };',
    );
  });

  it('computes a relative specifier for nested chunks', () => {
    const bundle = {
      'nested/base-badge.js': chunk('nested/base-badge.js', 'code;', ['base-badge.css']),
      'base-badge.css': asset('base-badge.css'),
    };

    runGenerateBundle(bundle);

    expect(bundle['nested/base-badge.js'].code).toContain('import "../base-badge.css";');
  });

  it('skips CSS names that were deduplicated away (not emitted into the bundle)', () => {
    // Under `preserveModules`, Vite lists a shared, byte-identical stylesheet in
    // every importer's `importedCss` but emits it only once (under one chunk's
    // name), dropping the duplicates. Re-linking a dropped name would produce a
    // dangling import that breaks consumer builds, so it must be skipped.
    const emitted = 'base-card.vue_vue_type_style_index_0_lang.css';
    const dropped = 'base-button.vue_vue_type_style_index_0_lang.css';
    const bundle = {
      'base-button.js': chunk('base-button.js', 'export { b as default };', [dropped]),
      'base-card.js': chunk('base-card.js', 'export { c as default };', [emitted]),
      [emitted]: asset(emitted),
    };

    runGenerateBundle(bundle);

    // The dropped name is filtered out, leaving the chunk untouched...
    expect(bundle['base-button.js'].code).toBe('export { b as default };');
    // ...while the retained, emitted stylesheet is still re-linked.
    expect(bundle['base-card.js'].code).toBe(
      'import "./base-card.vue_vue_type_style_index_0_lang.css";\nexport { c as default };',
    );
  });

  it('leaves chunks without associated CSS untouched (inline-styled components)', () => {
    const bundle = {
      'base-grid.js': chunk('base-grid.js', 'export { t as default };'),
    };

    runGenerateBundle(bundle);

    expect(bundle['base-grid.js'].code).toBe('export { t as default };');
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
