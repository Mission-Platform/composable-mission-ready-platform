import { describe, expect, it } from 'vitest';

import { jsxComponentsCssImportPlugin } from './generate';

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

/** Invoke the plugin's `generateBundle` hook (a plain function) over `bundle`. */
function runGenerateBundle(bundle: Record<string, Record<string, unknown>>): void {
  const plugin = jsxComponentsCssImportPlugin();
  const hook = plugin.generateBundle;
  if (typeof hook !== 'function') {
    throw new TypeError('expected a function generateBundle hook');
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (hook as any).call({}, {}, bundle);
}

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
});
