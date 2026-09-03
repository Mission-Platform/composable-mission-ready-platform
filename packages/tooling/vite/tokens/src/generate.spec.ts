import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { generateTokens } from './generate.js';

function valueAt(contract: Record<string, unknown>, ...segments: string[]): unknown {
  let current: unknown = contract;
  for (const segment of segments) current = (current as Record<string, unknown>)[segment];
  return (current as Record<string, unknown>)['$value'];
}

describe('generateTokens', () => {
  const testDirectory = path.join(tmpdir(), `mp-tokens-test-${Date.now()}`);
  const tokensDirectory = path.join(testDirectory, 'tokens');
  const overridesDirectory = path.join(testDirectory, 'overrides');
  const outDirectory = path.join(testDirectory, 'out');

  beforeEach(() => {
    mkdirSync(tokensDirectory, { recursive: true });
    mkdirSync(overridesDirectory, { recursive: true });
    // Minimal mock for all primitive, typography, and theme sources.
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
      'theme-light',
      'theme-dark',
    ];
    for (const cat of categories) {
      const content =
        cat === 'typography'
          ? { typography: { test: { $value: 'base' } } }
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
    mkdirSync(path.join(tokensDirectory, 'component', 'atoms'), { recursive: true });
    writeFileSync(
      path.join(tokensDirectory, 'component', 'atoms', 'button.tokens.json'),
      JSON.stringify({
        component: {
          button: {
            primary: {
              background: { default: { $value: '{color.primary.default}' } },
              padding: { $value: '{spacing.test}' },
            },
          },
        },
      }),
    );
    mkdirSync(path.join(tokensDirectory, 'component', 'molecules'), { recursive: true });
    writeFileSync(
      path.join(tokensDirectory, 'component', 'molecules', 'navigation.tokens.json'),
      JSON.stringify({
        component: {
          navigation: {
            item: {
              background: { $value: '{component.button.primary.background.default}' },
            },
          },
        },
      }),
    );
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

    const componentScss = readFileSync(path.join(outDirectory, 'scss', 'component', 'atoms', '_button.scss'), 'utf8');
    const componentVariables = readFileSync(
      path.join(outDirectory, 'scss', 'component', 'atoms', '_button-vars.scss'),
      'utf8',
    );
    expect(componentScss).toContain(
      '--mp-button-primary-background-default: #{vars.$button-primary-background-default};',
    );
    expect(componentVariables).toContain('$button-primary-background-default: var(--mp-color-primary-default);');
    expect(componentScss).toContain("syntax: '*';");
    expect(componentScss).not.toMatch(/@property --mp-button-primary-background-default \{[\s\S]*initial-value/);

    const componentTs = readFileSync(path.join(outDirectory, 'ts', 'component', 'atoms', 'button.ts'), 'utf8');
    expect(componentTs).toContain('"background": {');
    expect(componentTs).toContain('"default": "light-color"');
    expect(readFileSync(path.join(outDirectory, 'tokens.ts'), 'utf8')).toContain('./ts/component/atoms/button.js');
  });

  it('emits nested z-index paths to SCSS, CSS, and TypeScript', () => {
    writeFileSync(
      path.join(tokensDirectory, 'z-index.tokens.json'),
      JSON.stringify({
        'z-index': {
          $description: 'Semantic stacking layers.',
          $type: 'number',
          modal: {
            $description: 'Modal surfaces.',
            dialog: { $value: 450, $description: 'Dialog surface.' },
            onboarding: { $value: 500, $description: 'Onboarding surface.' },
          },
        },
      }),
    );

    generateTokens({ outDir: outDirectory, tokensDir: tokensDirectory });

    const zIndexScss = readFileSync(path.join(outDirectory, 'scss', '_z-index.scss'), 'utf8');
    const zIndexVariables = readFileSync(path.join(outDirectory, 'scss', '_z-index-vars.scss'), 'utf8');
    const zIndexTs = readFileSync(path.join(outDirectory, 'ts', 'z-index.ts'), 'utf8');
    expect(zIndexVariables).toContain('$z-index-modal-dialog: 450;');
    expect(zIndexScss).toContain('@property --mp-z-index-modal-dialog {');
    expect(zIndexScss).toContain('--mp-z-index-modal-onboarding: #{vars.$z-index-modal-onboarding};');
    expect(zIndexTs).toContain('"modal": {');
    expect(zIndexTs).toContain('"dialog": 450');
  });

  it('emits every recursively discovered component source and forwards them from both barrels', () => {
    generateTokens({ outDir: outDirectory, tokensDir: tokensDirectory });

    const scssBarrel = readFileSync(path.join(outDirectory, '_tokens.scss'), 'utf8');
    const tsBarrel = readFileSync(path.join(outDirectory, 'tokens.ts'), 'utf8');
    expect(scssBarrel).not.toContain('@charset "UTF-8";');
    expect(scssBarrel).toContain("@forward 'scss/component/atoms/button';");
    expect(scssBarrel).toContain("@forward 'scss/component/molecules/navigation';");
    expect(tsBarrel).toContain("export * from './ts/component/atoms/button.js';");
    expect(tsBarrel).toContain("export * from './ts/component/molecules/navigation.js';");

    const navigationScss = readFileSync(
      path.join(outDirectory, 'scss', 'component', 'molecules', '_navigation-vars.scss'),
      'utf8',
    );
    const navigationTs = readFileSync(path.join(outDirectory, 'ts', 'component', 'molecules', 'navigation.ts'), 'utf8');
    expect(navigationScss).toContain('$navigation-item-background: var(--mp-button-primary-background-default);');
    expect(navigationTs).toContain('"background": "light-color"');
  });

  it('keeps the pruned report, generated surface, and public barrel synchronized', () => {
    const repositoryRoot = path.resolve(import.meta.dirname, '../../../../../');
    const generatedDirectory = path.join(repositoryRoot, 'packages/ui/tokens/src/generated');
    const reproducedDirectory = path.join(testDirectory, 'repository-out');
    generateTokens({
      outDir: reproducedDirectory,
      tokensDir: path.join(repositoryRoot, 'packages/ui/tokens/tokens'),
    });
    const report = JSON.parse(
      readFileSync(
        path.join(repositoryRoot, 'packages/tooling/vite/tokens/src/fixtures/token-reachability.report.json'),
        'utf8',
      ),
    ) as {
      aliases: Array<{ to: string; resolved: boolean }>;
      sources: string[];
      summary: Record<string, number>;
      tokens: Array<{ status: string }>;
    };
    const generatedTsBarrel = readFileSync(path.join(generatedDirectory, 'tokens.ts'), 'utf8');
    const generatedScssBarrel = readFileSync(path.join(generatedDirectory, '_tokens.scss'), 'utf8');
    const paletteScss = readFileSync(path.join(generatedDirectory, 'scss/_palette.scss'), 'utf8');
    const typographyScss = readFileSync(path.join(generatedDirectory, 'scss/_typography.scss'), 'utf8');
    const paletteTs = readFileSync(path.join(generatedDirectory, 'ts/palette.ts'), 'utf8');
    const typographyTs = readFileSync(path.join(generatedDirectory, 'ts/typography.ts'), 'utf8');
    const buttonScss = readFileSync(path.join(generatedDirectory, 'scss/component/atoms/_button.scss'), 'utf8');
    const publicBarrel = readFileSync(path.join(repositoryRoot, 'packages/ui/tokens/src/tokens.ts'), 'utf8');

    expect(report.summary).toEqual({ active: 157, protected: 2191, ambiguous: 549, candidate: 0 });
    expect(report.sources).toEqual([...report.sources].toSorted((a, b) => a.localeCompare(b)));
    expect(report.tokens.filter(({ status }) => status === 'candidate')).toHaveLength(0);
    expect(report.aliases.filter(({ resolved }) => !resolved).map(({ to }) => to)).toEqual([
      'color.surface.raised',
      'radius.2xs',
      'font.weight.light',
    ]);

    expect(generatedTsBarrel).not.toContain('component/templates/inherited');
    expect(generatedScssBarrel).not.toContain('component/templates/inherited');
    expect(readFileSync(path.join(reproducedDirectory, 'tokens.ts'), 'utf8')).toBe(generatedTsBarrel);
    expect(readFileSync(path.join(reproducedDirectory, '_tokens.scss'), 'utf8')).toBe(generatedScssBarrel);
    expect(paletteScss).not.toContain('--mp-color-black');
    expect(typographyScss).not.toContain('--mp-typography-code-');
    expect(paletteTs).not.toContain('"black":');
    expect(typographyTs).not.toContain('"code":');
    expect(buttonScss).toContain('@property --mp-button-primary-background-hover {');
    expect(buttonScss).toContain('--mp-button-primary-background-hover: #{vars.$button-primary-background-hover};');
    expect(publicBarrel).toContain("export * from './generated/tokens.js';");
    expect(publicBarrel).toContain('export type SizeScale = keyof typeof size.font;');
  });

  it('applies a directory override to only its split component source', () => {
    const overridePath = path.join(overridesDirectory, 'component', 'atoms', 'button.tokens.json');
    mkdirSync(path.dirname(overridePath), { recursive: true });
    writeFileSync(
      overridePath,
      JSON.stringify({
        component: { button: { primary: { padding: { $value: '{radius.test}' } } } },
      }),
    );

    generateTokens({ outDir: outDirectory, tokensDir: tokensDirectory, overridesDir: overridesDirectory });

    expect(readFileSync(path.join(outDirectory, 'scss', 'component', 'atoms', '_button-vars.scss'), 'utf8')).toContain(
      '$button-primary-padding: var(--mp-radius-test);',
    );
    expect(readFileSync(path.join(outDirectory, 'ts', 'component', 'molecules', 'navigation.ts'), 'utf8')).toContain(
      '"background": "light-color"',
    );
  });

  it('migrates a legacy aggregate component override by layer without affecting other sources', () => {
    writeFileSync(
      path.join(overridesDirectory, 'component.tokens.json'),
      JSON.stringify({
        component: { button: { primary: { padding: { $value: '{radius.test}' } } } },
      }),
    );

    generateTokens({ outDir: outDirectory, tokensDir: tokensDirectory, overridesDir: overridesDirectory });

    expect(readFileSync(path.join(outDirectory, 'scss', 'component', 'atoms', '_button-vars.scss'), 'utf8')).toContain(
      '$button-primary-padding: var(--mp-radius-test);',
    );
    expect(readFileSync(path.join(outDirectory, 'ts', 'component', 'molecules', 'navigation.ts'), 'utf8')).toContain(
      '"background": "light-color"',
    );
  });

  it('rejects two split sources that claim the same CSS namespace', () => {
    writeFileSync(
      path.join(tokensDirectory, 'component', 'molecules', 'button.tokens.json'),
      JSON.stringify({ component: { button: { duplicate: { $value: 'value' } } } }),
    );

    expect(() => generateTokens({ outDir: outDirectory, tokensDir: tokensDirectory })).toThrow(
      'Duplicate component CSS namespace: button',
    );
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

    expect(readFileSync(path.join(outDirectory, 'scss', 'component', 'atoms', '_button-vars.scss'), 'utf8')).toContain(
      '$button-primary-padding: var(--mp-radius-test);',
    );
    expect(readFileSync(path.join(outDirectory, 'ts', 'component', 'atoms', 'button.ts'), 'utf8')).toContain(
      '"padding": "base"',
    );
  });

  it('keeps core form component aliases on their original visual scales', () => {
    const contractPath = path.resolve(
      path.dirname(new URL(import.meta.url).pathname),
      '../../../../ui/tokens/tokens/component.tokens.json',
    );
    const contract = JSON.parse(readFileSync(contractPath, 'utf8')) as Record<string, unknown>;

    expect(valueAt(contract, 'component', 'input', 'field-gap')).toBe('{spacing.1}');
    expect(valueAt(contract, 'component', 'input', 'text', 'secondary')).toBe('{color.text.secondary}');
    expect(valueAt(contract, 'component', 'input', 'focus-ring-invalid')).toBe('{shadow.focus-danger}');
    expect(valueAt(contract, 'component', 'select', 'field-gap')).toBe('{spacing.1}');
    expect(valueAt(contract, 'component', 'select', 'text', 'secondary')).toBe('{color.text.secondary}');
    expect(valueAt(contract, 'component', 'checkable', 'gap', 'stack')).toBe('{spacing.1}');
    expect(valueAt(contract, 'component', 'checkable', 'gap', 'inline')).toBe('{spacing.2}');
    expect(valueAt(contract, 'component', 'field', 'required')).toBe('{color.danger.default}');
  });

  it('keeps compact float overlays on their original visual scales', () => {
    const contractPath = path.resolve(
      path.dirname(new URL(import.meta.url).pathname),
      '../../../../ui/tokens/tokens/component.tokens.json',
    );
    const contract = JSON.parse(readFileSync(contractPath, 'utf8')) as Record<string, unknown>;

    expect(valueAt(contract, 'component', 'overlay', 'alert-banner', 'gap')).toBe('{spacing.3}');
    expect(valueAt(contract, 'component', 'overlay', 'alert-banner', 'padding-block')).toBe('{spacing.3}');
    expect(valueAt(contract, 'component', 'overlay', 'alert-banner', 'padding-inline')).toBe('{spacing.4}');
    expect(valueAt(contract, 'component', 'overlay', 'alert-banner', 'content-gap')).toBe('{spacing.1}');
    expect(valueAt(contract, 'component', 'overlay', 'alert-banner', 'dismiss', 'opacity')).toBe(
      '{opacity.interactive}',
    );
    expect(valueAt(contract, 'component', 'overlay', 'alert-banner', 'dismiss', 'transition-duration')).toBe(
      '{duration.fast}',
    );
    expect(valueAt(contract, 'component', 'overlay', 'alert-banner', 'dismiss', 'transition-easing')).toBe(
      '{easing.standard}',
    );

    expect(valueAt(contract, 'component', 'overlay', 'dropdown', 'surface')).toBe('{color.bg.surface}');
    expect(valueAt(contract, 'component', 'overlay', 'dropdown', 'radius')).toBe('{radius.md}');
    expect(valueAt(contract, 'component', 'overlay', 'dropdown', 'shadow')).toBe('{shadow.md}');
    expect(valueAt(contract, 'component', 'overlay', 'dropdown', 'transition', 'duration')).toBe('{duration.fast}');
    expect(valueAt(contract, 'component', 'overlay', 'popover', 'radius')).toBe('{radius.lg}');
    expect(valueAt(contract, 'component', 'overlay', 'popover', 'shadow')).toBe('{shadow.lg}');
    expect(valueAt(contract, 'component', 'overlay', 'popover', 'transition', 'duration')).toBe('{duration.fast}');
    expect(valueAt(contract, 'component', 'overlay', 'toast', 'gap')).toBe('{spacing.3}');
    expect(valueAt(contract, 'component', 'overlay', 'toast', 'padding-block')).toBe('{spacing.3}');
    expect(valueAt(contract, 'component', 'overlay', 'toast', 'padding-inline')).toBe('{spacing.4}');
    expect(valueAt(contract, 'component', 'overlay', 'toast', 'text', 'message')).toBe('{color.text.secondary}');
    expect(valueAt(contract, 'component', 'overlay', 'toast', 'radius')).toBe('{radius.md}');
    expect(valueAt(contract, 'component', 'overlay', 'toast', 'shadow')).toBe('{shadow.lg}');
    expect(valueAt(contract, 'component', 'overlay', 'toast', 'transition', 'duration')).toBe('{duration.fast}');
    expect(valueAt(contract, 'component', 'overlay', 'dialog', 'surface', 'default')).toBe('{color.bg.surface}');
    expect(valueAt(contract, 'component', 'overlay', 'modal', 'surface', 'default')).toBe('{color.bg.surface}');
    expect(valueAt(contract, 'component', 'overlay', 'modal', 'shadow')).toBe('{shadow.2xl}');
  });
});
