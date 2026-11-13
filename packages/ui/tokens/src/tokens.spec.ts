import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { generateTokens } from '@mission-platform/vite-plugin-tokens';

import * as tokens from './tokens.js';

describe('@mission-platform/tokens', () => {
  const packageRoot = path.resolve(import.meta.dirname, '..');
  const tokensDirectory = path.resolve(packageRoot, 'tokens');
  const generatedDirectory = path.resolve(packageRoot, 'src/generated');
  const scssGeneratedDirectory = path.resolve(generatedDirectory, 'scss');

  it('generates all expected token categories from DTCG sources', () => {
    generateTokens({
      tokensDir: tokensDirectory,
      outDir: generatedDirectory,
    });

    expect(fs.existsSync(path.resolve(generatedDirectory, 'tokens.ts'))).toBe(true);
    expect(fs.existsSync(path.resolve(generatedDirectory, '_tokens.scss'))).toBe(true);
    expect(fs.existsSync(path.resolve(scssGeneratedDirectory, '_theme.scss'))).toBe(true);
  });

  it('exports all core token categories in TypeScript', () => {
    expect(tokens).toHaveProperty('palette');
    expect(tokens).toHaveProperty('typography');
    expect(tokens).toHaveProperty('spacing');
    expect(tokens).toHaveProperty('shadow');
    expect(tokens).toHaveProperty('radius');
    expect(tokens).toHaveProperty('motion');
    expect(tokens).toHaveProperty('opacity');
    expect(tokens).toHaveProperty('zIndex');
    expect(tokens).toHaveProperty('borderWidth');
    expect(tokens).toHaveProperty('breakpoint');
    expect(tokens).toHaveProperty('font');
    expect(tokens).toHaveProperty('size');
    expect(tokens).toHaveProperty('themeLight');
    expect(tokens).toHaveProperty('themeDark');
  });

  it('exports component token categories in TypeScript', () => {
    // Component atoms & molecules
    expect(tokens).toHaveProperty('button');
    expect(tokens).toHaveProperty('buttonGroup');
    expect(tokens).toHaveProperty('checkable');
    expect(tokens).toHaveProperty('code');
    expect(tokens).toHaveProperty('feedback');
    expect(tokens).toHaveProperty('icon');
    expect(tokens).toHaveProperty('input');
    expect(tokens).toHaveProperty('layout');
    expect(tokens).toHaveProperty('media');
    expect(tokens).toHaveProperty('surface');
    expect(tokens).toHaveProperty('tag');
    expect(tokens).toHaveProperty('themeToggle');
    expect(tokens).toHaveProperty('componentAtomsTypography');

    expect(tokens).toHaveProperty('calendar');
    expect(tokens).toHaveProperty('card');
    expect(tokens).toHaveProperty('chatBubble');
    expect(tokens).toHaveProperty('collapse');
    expect(tokens).toHaveProperty('colorInput');
    expect(tokens).toHaveProperty('debug');
    expect(tokens).toHaveProperty('editor');
    expect(tokens).toHaveProperty('field');
    expect(tokens).toHaveProperty('fieldSet');
    expect(tokens).toHaveProperty('inView');
    expect(tokens).toHaveProperty('markdown');
    expect(tokens).toHaveProperty('navigation');
    expect(tokens).toHaveProperty('overlay');
    expect(tokens).toHaveProperty('select');
    expect(tokens).toHaveProperty('time');
    expect(tokens).toHaveProperty('timeline');

    // Organisms & Templates
    expect(tokens).toHaveProperty('data');
    expect(tokens).toHaveProperty('form');
    expect(tokens).toHaveProperty('map');
    expect(tokens).toHaveProperty('resourcePlanner');
    expect(tokens).toHaveProperty('scheduler');
    expect(tokens).toHaveProperty('email');
  });

  it('synchronizes SCSS variables and CSS custom properties with TS tokens', () => {
    const scssBarrel = fs.readFileSync(path.resolve(generatedDirectory, '_tokens.scss'), 'utf8');
    expect(scssBarrel).toContain("@forward 'scss/palette';");
    expect(scssBarrel).toContain("@forward 'scss/spacing';");
    expect(scssBarrel).toContain("@forward 'scss/typography';");
    expect(scssBarrel).toContain("@forward 'scss/theme';");

    const scssTheme = fs.readFileSync(path.resolve(scssGeneratedDirectory, '_theme.scss'), 'utf8');
    expect(scssTheme).toContain('light-dark(');
    expect(scssTheme).toContain('--mp-color-');

    // Verify key SCSS variable files exist
    expect(fs.existsSync(path.resolve(scssGeneratedDirectory, '_palette.scss'))).toBe(true);
    expect(fs.existsSync(path.resolve(scssGeneratedDirectory, '_typography.scss'))).toBe(true);
    expect(fs.existsSync(path.resolve(scssGeneratedDirectory, '_spacing.scss'))).toBe(true);
    expect(fs.existsSync(path.resolve(scssGeneratedDirectory, '_shadow.scss'))).toBe(true);
    expect(fs.existsSync(path.resolve(scssGeneratedDirectory, '_radius.scss'))).toBe(true);

    const scssSpacing = fs.readFileSync(path.resolve(scssGeneratedDirectory, '_spacing.scss'), 'utf8');
    expect(scssSpacing).toContain('--mp-spacing-');
    expect(scssSpacing).toContain('vars.$spacing-');
  });

  it('exposes canonical size scale keys matching SizeScale', () => {
    const expectedFontScales = ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'];
    for (const scale of expectedFontScales) {
      expect(tokens.size.font).toHaveProperty(scale);
    }

    const expectedSpacingScales = ['0', '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'];
    for (const scale of expectedSpacingScales) {
      expect(tokens.spacing).toHaveProperty(scale);
    }
  });
});
