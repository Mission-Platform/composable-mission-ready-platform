import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { generateTokens } from './generate.js';

describe('generateTokens', () => {
  const testDirectory = path.join(tmpdir(), `mp-tokens-test-${Date.now()}`);
  const tokensDirectory = path.join(testDirectory, 'tokens');
  const overridesDirectory = path.join(testDirectory, 'overrides');
  const outDirectory = path.join(testDirectory, 'out');

  beforeEach(() => {
    mkdirSync(tokensDirectory, { recursive: true });
    mkdirSync(overridesDirectory, { recursive: true });
    // Minimal mock for all 15 categories
    const categories = [
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
      'component',
      'theme-light',
      'theme-dark',
    ];
    for (const cat of categories) {
      const content =
        cat === 'typography'
          ? { typography: { test: { $value: 'base' } } }
          : cat === 'component'
            ? {
                component: {
                  button: {
                    primary: {
                      background: { default: { $value: '{color.primary.default}' } },
                      padding: { $value: '{spacing.test}' },
                    },
                  },
                },
              }
            : cat === 'palette'
              ? {
                  palette: { test: { $value: 'base' } },
                  color: { primary: { default: { $value: 'palette-color' } } },
                }
              : cat === 'theme-light'
                ? { color: { primary: { default: { $value: 'light-color' } } } }
                : { [cat.replace('theme-', '')]: { test: { $value: 'base' } } };
      writeFileSync(path.join(tokensDirectory, `${cat}.tokens.json`), JSON.stringify(content));
    }
  });

  afterEach(() => {
    rmSync(testDirectory, { force: true, recursive: true });
  });

  it('merges tokens from overridesDir and overrides record', () => {
    // Override via directory
    writeFileSync(
      path.join(overridesDirectory, 'spacing.tokens.json'),
      JSON.stringify({
        spacing: { test: { $value: 'dir-override' }, new: { $value: 'dir-added' } },
      }),
    );

    // Override via options record
    const overrides = {
      palette: {
        palette: { test: { $value: 'rec-override' } },
      },
    };

    generateTokens({
      outDir: outDirectory,
      overrides,
      overridesDir: overridesDirectory,
      tokensDir: tokensDirectory,
    });

    // Check spacing (dir override)
    const spacingTs = readFileSync(path.join(outDirectory, 'ts', 'spacing.ts'), 'utf8');
    expect(spacingTs).toContain('"test": "dir-override"');
    expect(spacingTs).toContain('"new": "dir-added"');

    // Check palette (record override)
    const paletteTs = readFileSync(path.join(outDirectory, 'ts', 'palette.ts'), 'utf8');
    expect(paletteTs).toContain('"test": "rec-override"');

    // Check z-index (no override, should have base)
    const zIndexTs = readFileSync(path.join(outDirectory, 'ts', 'z-index.ts'), 'utf8');
    expect(zIndexTs).toContain('"test": "base"');
  });

  it('emits component aliases as CSS variables and resolves them in nested TypeScript output', () => {
    generateTokens({ outDir: outDirectory, tokensDir: tokensDirectory });

    const componentScss = readFileSync(path.join(outDirectory, 'scss', '_component.scss'), 'utf8');
    const componentVariables = readFileSync(path.join(outDirectory, 'scss', '_component-vars.scss'), 'utf8');
    expect(componentScss).toContain(
      '--mp-component-button-primary-background-default: #{vars.$component-button-primary-background-default};',
    );
    expect(componentVariables).toContain(
      '$component-button-primary-background-default: var(--mp-color-primary-default);',
    );
    expect(componentScss).toContain("syntax: '*';");
    expect(componentScss).not.toMatch(
      /@property --mp-component-button-primary-background-default \{[\s\S]*initial-value/,
    );

    const componentTs = readFileSync(path.join(outDirectory, 'ts', 'component.ts'), 'utf8');
    expect(componentTs).toContain('"background": {');
    expect(componentTs).toContain('"default": "light-color"');
    expect(readFileSync(path.join(outDirectory, 'tokens.ts'), 'utf8')).toContain('./ts/component.js');
  });

  it('preserves component overrides through CSS and TypeScript generation', () => {
    generateTokens({
      outDir: outDirectory,
      tokensDir: tokensDirectory,
      overrides: {
        component: {
          component: {
            button: {
              primary: { padding: { $value: '{radius.test}' } },
            },
          },
        },
      },
    });

    expect(readFileSync(path.join(outDirectory, 'scss', '_component-vars.scss'), 'utf8')).toContain(
      '$component-button-primary-padding: var(--mp-radius-test);',
    );
    expect(readFileSync(path.join(outDirectory, 'ts', 'component.ts'), 'utf8')).toContain('"padding": "base"');
  });

  it('keeps core form component aliases on their original visual scales', () => {
    const contractPath = path.resolve(
      path.dirname(new URL(import.meta.url).pathname),
      '../../../packages/tokens/tokens/component.tokens.json',
    );
    const contract = JSON.parse(readFileSync(contractPath, 'utf8')) as Record<string, unknown>;
    const valueAt = (...segments: string[]): unknown => {
      let current: unknown = contract;
      for (const segment of segments) {
        current = (current as Record<string, unknown>)[segment];
      }
      return (current as Record<string, unknown>)['$value'];
    };

    expect(valueAt('component', 'input', 'field-gap')).toBe('{spacing.1}');
    expect(valueAt('component', 'input', 'text', 'secondary')).toBe('{color.text.secondary}');
    expect(valueAt('component', 'input', 'focus-ring-invalid')).toBe('{shadow.focus-danger}');
    expect(valueAt('component', 'select', 'field-gap')).toBe('{spacing.1}');
    expect(valueAt('component', 'select', 'text', 'secondary')).toBe('{color.text.secondary}');
    expect(valueAt('component', 'checkable', 'gap', 'stack')).toBe('{spacing.1}');
    expect(valueAt('component', 'checkable', 'gap', 'inline')).toBe('{spacing.2}');
    expect(valueAt('component', 'field', 'required')).toBe('{color.danger.default}');
  });

  it('keeps compact float overlays on their original visual scales', () => {
    const contractPath = path.resolve(
      path.dirname(new URL(import.meta.url).pathname),
      '../../../packages/tokens/tokens/component.tokens.json',
    );
    const contract = JSON.parse(readFileSync(contractPath, 'utf8')) as Record<string, unknown>;
    const valueAt = (...segments: string[]): unknown => {
      let current: unknown = contract;
      for (const segment of segments) {
        current = (current as Record<string, unknown>)[segment];
      }
      return (current as Record<string, unknown>)['$value'];
    };

    expect(valueAt('component', 'overlay', 'alert-banner', 'gap')).toBe('{spacing.3}');
    expect(valueAt('component', 'overlay', 'alert-banner', 'padding-block')).toBe('{spacing.3}');
    expect(valueAt('component', 'overlay', 'alert-banner', 'padding-inline')).toBe('{spacing.4}');
    expect(valueAt('component', 'overlay', 'alert-banner', 'content-gap')).toBe('{spacing.1}');
    expect(valueAt('component', 'overlay', 'alert-banner', 'dismiss', 'opacity')).toBe('{opacity.interactive}');
    expect(valueAt('component', 'overlay', 'alert-banner', 'dismiss', 'transition-duration')).toBe('{duration.fast}');
    expect(valueAt('component', 'overlay', 'alert-banner', 'dismiss', 'transition-easing')).toBe('{easing.standard}');

    expect(valueAt('component', 'overlay', 'dropdown', 'surface')).toBe('{color.bg.surface}');
    expect(valueAt('component', 'overlay', 'dropdown', 'radius')).toBe('{radius.md}');
    expect(valueAt('component', 'overlay', 'dropdown', 'shadow')).toBe('{shadow.md}');
    expect(valueAt('component', 'overlay', 'dropdown', 'transition', 'duration')).toBe('{duration.fast}');
    expect(valueAt('component', 'overlay', 'popover', 'radius')).toBe('{radius.lg}');
    expect(valueAt('component', 'overlay', 'popover', 'shadow')).toBe('{shadow.lg}');
    expect(valueAt('component', 'overlay', 'popover', 'transition', 'duration')).toBe('{duration.fast}');
    expect(valueAt('component', 'overlay', 'toast', 'gap')).toBe('{spacing.3}');
    expect(valueAt('component', 'overlay', 'toast', 'padding-block')).toBe('{spacing.3}');
    expect(valueAt('component', 'overlay', 'toast', 'padding-inline')).toBe('{spacing.4}');
    expect(valueAt('component', 'overlay', 'toast', 'text', 'message')).toBe('{color.text.secondary}');
    expect(valueAt('component', 'overlay', 'toast', 'radius')).toBe('{radius.md}');
    expect(valueAt('component', 'overlay', 'toast', 'shadow')).toBe('{shadow.lg}');
    expect(valueAt('component', 'overlay', 'toast', 'transition', 'duration')).toBe('{duration.fast}');
    expect(valueAt('component', 'overlay', 'dialog', 'surface', 'default')).toBe('{color.bg.surface}');
    expect(valueAt('component', 'overlay', 'modal', 'surface', 'default')).toBe('{color.bg.surface}');
    expect(valueAt('component', 'overlay', 'modal', 'shadow')).toBe('{shadow.2xl}');
  });
});
