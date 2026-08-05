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
    // Minimal mock for all 14 categories
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
});
