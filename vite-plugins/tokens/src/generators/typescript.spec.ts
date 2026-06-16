import { describe, expect, it } from 'vitest';

import { buildBarrelModule, buildTokenModule } from './typescript.js';

describe('buildTokenModule', () => {
  it('unwraps a single top-level group whose key equals the file basename', () => {
    const module = buildTokenModule('size', {
      size: { $type: 'dimension', icon: { md: { $value: '1rem' } } },
    });
    expect(module).toContain('export const size = {');
    expect(module).toContain('"icon": {');
    expect(module).toContain('"md": "1rem"');
    expect(module.trimEnd().endsWith('} as const;')).toBe(true);
  });

  it('camelCases the export name and unwraps `z-index`', () => {
    const module = buildTokenModule('z-index', { 'z-index': { $type: 'number', base: { $value: 0 } } });
    expect(module).toContain('export const zIndex = {');
    expect(module).toContain('"base": 0');
  });

  it('keeps the wrapper group when its key differs from the basename', () => {
    const module = buildTokenModule('palette', {
      color: { $type: 'color', white: { $value: { colorSpace: 'oklab', components: [1, 0, 0] } } },
    });
    expect(module).toContain('export const palette = {');
    expect(module).toContain('"color": {');
    expect(module).toContain('"white": "oklab(1 0 0)"');
  });

  it('preserves all top-level groups for multi-group sources', () => {
    const module = buildTokenModule('font', {
      font: { family: { $value: 'sans' } },
      'line-height': { normal: { $value: 1.5 } },
    });
    expect(module).toContain('export const font = {');
    expect(module).toContain('"font": {');
    expect(module).toContain('"line-height": {');
    expect(module).toContain('"normal": 1.5');
  });

  it('resolves composite aliases against the supplied alias document', () => {
    const fontDocument = {
      font: { family: { sans: { $value: 'Comfortaa' } }, weight: { bold: { $value: 700 } } },
    };
    const module = buildTokenModule(
      'typography',
      { typography: { h1: { $value: { fontFamily: '{font.family.sans}', fontWeight: '{font.weight.bold}' } } } },
      fontDocument,
    );
    expect(module).toContain('export const typography = {');
    expect(module).toContain('"fontFamily": "Comfortaa"');
    expect(module).toContain('"fontWeight": 700');
  });
});

describe('buildBarrelModule', () => {
  it('re-exports every per-file module, sorted', () => {
    const barrel = buildBarrelModule(['size', 'palette', 'z-index']);
    expect(barrel).toContain("export * from './ts/palette.js';");
    expect(barrel).toContain("export * from './ts/size.js';");
    expect(barrel).toContain("export * from './ts/z-index.js';");
    expect(barrel.indexOf('palette')).toBeLessThan(barrel.indexOf('size'));
    expect(barrel.indexOf('size')).toBeLessThan(barrel.indexOf('z-index'));
  });
});
