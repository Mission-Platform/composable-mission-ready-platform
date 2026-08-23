import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildTokenOverrideScss, flattenOverrides, tokenOverridesPlugin } from '.';

import type { OverrideGroup, TokenOverridesPluginOptions } from '.';

const document: OverrideGroup = {
  $description: 'ignored metadata',
  color: {
    primary: {
      default: { $value: { light: '#8b7ff0', dark: '#a99cf5' }, $description: 'brand' },
    },
  },
  radius: {
    md: { $value: '2px' },
  },
};

describe('transform', () => {
  it('flattens leaves into prefixed custom-property names, skipping $-metadata', () => {
    const flat = flattenOverrides(document);
    expect(flat).toEqual([
      { name: '--mp-color-primary-default', value: 'light-dark(#8b7ff0, #a99cf5)', description: 'brand' },
      { name: '--mp-radius-md', value: '2px', description: undefined },
    ]);
  });

  it('emits a :root block with light-dark() colours and literal scalars', () => {
    const scss = buildTokenOverrideScss(document, { header: '/* h */' });
    expect(scss).toContain(':root {');
    expect(scss).toContain('--mp-color-primary-default: light-dark(#8b7ff0, #a99cf5);');
    expect(scss).toContain('--mp-radius-md: 2px;');
    expect(scss).toContain('/* brand */');
  });

  it('honours a custom prefix', () => {
    const scss = buildTokenOverrideScss({ radius: { md: { $value: '2px' } } }, { prefix: 'acme' });
    expect(scss).toContain('--acme-radius-md: 2px;');
  });

  it('projects component overrides to the owning layer namespace', () => {
    const flat = flattenOverrides({
      component: { button: { primary: { $value: '#153fd1' } } },
    });

    expect(flat).toEqual([{ name: '--mp-button-primary', value: '#153fd1', description: undefined }]);
  });

  it('preserves supported CSS scalar values and finite numbers', () => {
    const flat = flattenOverrides({
      font: { family: { sans: { $value: "'Inter', ui-sans-serif, sans-serif" } } },
      layout: { size: { $value: 'clamp(1rem, 2vw, 3rem)' } },
      shadow: { sm: { $value: '0 1px 2px rgb(0 0 0 / 12%)' } },
      weight: { bold: { $value: 700 } },
    });

    expect(flat.map(({ name, value }) => ({ name, value }))).toEqual([
      { name: '--mp-font-family-sans', value: "'Inter', ui-sans-serif, sans-serif" },
      { name: '--mp-layout-size', value: 'clamp(1rem, 2vw, 3rem)' },
      { name: '--mp-shadow-sm', value: '0 1px 2px rgb(0 0 0 / 12%)' },
      { name: '--mp-weight-bold', value: '700' },
    ]);
  });

  it('rejects malformed runtime documents and values', () => {
    const malformed = [
      undefined,
      [],
      { radius: '2px' },
      { $description: 42 },
      { $schema: 42 },
      { $value: '2px' },
      { radius: { md: { $value: true } } },
      { radius: { md: { $value: { light: '#fff' } } } },
      { radius: { md: { $value: { light: '#fff', dark: '#000', extra: 'nope' } } } },
    ];

    for (const value of malformed) {
      expect(() => flattenOverrides(value as OverrideGroup)).toThrow();
    }
  });

  it('rejects CSS injection delimiters in names, values, and comments', () => {
    expect(() => flattenOverrides({ 'radius;--injected': { $value: '2px' } })).toThrow();
    expect(() => flattenOverrides({ radius: { md: { $value: '2px; color: red' } } })).toThrow();
    expect(() => flattenOverrides({ radius: { md: { $value: '2px /* injected */' } } })).toThrow();
    expect(() =>
      flattenOverrides({ radius: { md: { $value: '2px', $description: 'safe */\n--injected: red' } } }),
    ).toThrow();
    expect(() => flattenOverrides({ radius: { md: { $value: '2px\u0000' } } })).toThrow();
    expect(() =>
      flattenOverrides({ radius: { md: { $value: { light: '#fff', dark: 'red;--injected: blue' } } } }),
    ).toThrow();
    expect(() =>
      buildTokenOverrideScss({ radius: { md: { $value: '2px' } } }, { prefix: 'acme;--injected' }),
    ).toThrow();
    expect(() =>
      buildTokenOverrideScss({ radius: { md: { $value: '2px' } } }, { header: '/* banner */ :root {}' }),
    ).toThrow();
  });

  it('continues to emit safe unknown token keys for the caller warning path', () => {
    const scss = buildTokenOverrideScss({ app: { custom: { $value: '2px' } } });
    expect(scss).toContain('--mp-app-custom: 2px;');
  });

  it('preserves ordinary punctuation in safe descriptions', () => {
    const scss = buildTokenOverrideScss({
      button: { primary: { $value: '#153fd1', $description: 'Use this override; it is Storybook-only.' } },
    });

    expect(scss).toContain('/* Use this override; it is Storybook-only. */');
  });
});

describe('tokenOverridesPlugin', () => {
  let directory: string;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'token-overrides-'));
    fs.writeFileSync(path.join(directory, 'overrides.tokens.json'), JSON.stringify(document), 'utf8');
  });

  afterEach(() => {
    fs.rmSync(directory, { recursive: true, force: true });
  });

  /** Drive the plugin's `configResolved` + `buildStart` hooks against `directory`. */
  function build(options: TokenOverridesPluginOptions): void {
    const plugin = tokenOverridesPlugin(options);
    (plugin.configResolved as (config: { root: string }) => void)({ root: directory });
    (plugin.buildStart as () => void)();
  }

  it('generates the override SCSS next to the source by default', () => {
    build({ source: 'overrides.tokens.json' });

    const generated = fs.readFileSync(path.join(directory, 'overrides.generated.scss'), 'utf8');
    expect(generated).toContain('--mp-color-primary-default: light-dark(#8b7ff0, #a99cf5);');
    expect(generated).toContain('--mp-radius-md: 2px;');
    expect(generated).toContain('/* brand */');
  });

  it('honours a custom outFile and prefix', () => {
    build({ source: 'overrides.tokens.json', outFile: 'nested/theme.scss', prefix: 'acme' });

    const generated = fs.readFileSync(path.join(directory, 'nested', 'theme.scss'), 'utf8');
    expect(generated).toContain('--acme-radius-md: 2px;');
    expect(fs.existsSync(path.join(directory, 'overrides.generated.scss'))).toBe(false);
  });

  it('does not rewrite the file when the output is unchanged', () => {
    build({ source: 'overrides.tokens.json' });
    const outFile = path.join(directory, 'overrides.generated.scss');
    const firstMtime = fs.statSync(outFile).mtimeMs;

    build({ source: 'overrides.tokens.json' });
    expect(fs.statSync(outFile).mtimeMs).toBe(firstMtime);
  });
});
