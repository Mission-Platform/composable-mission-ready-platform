import { describe, expect, it } from 'vitest';

import {
  aliasToCssVariable,
  camelCase,
  camelCaseName,
  compareTokens,
  dashedName,
  deepMergeTokens,
  type DtcgGroup,
  flattenTokens,
  formatColorValue,
  formatCssColor,
  formatCssValue,
  formatKey,
  groupLabel,
  isAlias,
  resolveAlias,
  resolveTsValue,
  type TokenRecord,
} from './dtcg.js';

const record = (path: string[], extra: Partial<TokenRecord> = {}): TokenRecord => ({
  path,
  group: path[0],
  value: '',
  ...extra,
});

describe('flattenTokens', () => {
  const document_ = {
    color: {
      $type: 'color',
      alert: { '100': { $value: { colorSpace: 'oklab', components: [0.9, 0, 0] }, $description: 'alert 100' } },
    },
    font: { size: { $type: 'dimension', md: { $value: '1rem' } } },
  };

  it('flattens nested groups, inheriting `$type` and recording the top-level group', () => {
    const records = flattenTokens(document_);
    expect(records.find((entry) => dashedName(entry) === 'color-alert-100')).toMatchObject({
      group: 'color',
      type: 'color',
      description: 'alert 100',
    });
    expect(records.find((entry) => dashedName(entry) === 'font-size-md')).toMatchObject({
      group: 'font',
      type: 'dimension',
      value: '1rem',
    });
  });
});

describe('naming helpers', () => {
  it('camelCases dashed strings while preserving leading digits', () => {
    expect(camelCase('border-width')).toBe('borderWidth');
    expect(camelCase('z-index')).toBe('zIndex');
    expect(camelCaseName(record(['font', 'size', '2xl']))).toBe('fontSize2xl');
  });

  it('title-cases group keys for SCSS headers', () => {
    expect(groupLabel('border-width')).toBe('Border Width');
  });

  it('compares tokens by their dashed name', () => {
    expect(compareTokens(record(['a']), record(['b']))).toBeLessThan(0);
    expect(compareTokens(record(['b']), record(['a']))).toBeGreaterThan(0);
  });

  it('quotes non-numeric keys only', () => {
    expect(formatKey('500')).toBe('500');
    expect(formatKey('mono')).toBe("'mono'");
  });
});

describe('deepMergeTokens', () => {
  it('deep-merges two DTCG groups, overwriting scalar values and merging objects', () => {
    const base: DtcgGroup = {
      color: {
        primary: { $value: 'blue', $type: 'color' },
        neutral: { $value: 'gray' },
      },
      spacing: { 1: { $value: '4px' } },
    };
    const override: DtcgGroup = {
      color: {
        primary: { $value: 'cyan' },
        secondary: { $value: 'magenta' },
      },
    };
    const result = deepMergeTokens(base, override);
    expect(result).toEqual({
      color: {
        primary: { $value: 'cyan', $type: 'color' },
        neutral: { $value: 'gray' },
        secondary: { $value: 'magenta' },
      },
      spacing: { 1: { $value: '4px' } },
    });
  });

  it('replaces arrays instead of merging them', () => {
    const base: DtcgGroup = { font: { family: { $value: ['Arial', 'sans-serif'] } } };
    const override: DtcgGroup = { font: { family: { $value: ['Inter'] } } };
    const result = deepMergeTokens(base, override);
    expect(((result.font as DtcgGroup).family as DtcgGroup).$value).toEqual(['Inter']);
  });
});

describe('value formatters', () => {
  it('formats colours verbatim and rounded', () => {
    expect(formatColorValue({ colorSpace: 'oklab', components: [0.901_46, 0, 0] })).toBe('oklab(0.90146 0 0)');
    expect(formatCssColor({ colorSpace: 'oklab', components: [0.901_46, 0.024_11, 0.068_85] })).toBe(
      'oklab(0.9015 0.02411 0.06885)',
    );
    expect(formatCssColor({ colorSpace: 'oklab', components: [1, 0, 0], alpha: 0.7 })).toBe('oklab(1 0 0 / 0.7)');
  });

  it('formats CSS values (colours rounded, others verbatim)', () => {
    expect(formatCssValue('1.143rem')).toBe('1.143rem');
    expect(formatCssValue(400)).toBe('400');
    expect(formatCssValue({ colorSpace: 'oklab', components: [0.3345, 0, 0] })).toBe('oklab(0.3345 0 0)');
  });

  it('formats comma-separated string arrays as a CSS list', () => {
    expect(formatCssValue(['Comfortaa', 'Inter', 'sans-serif'])).toBe('Comfortaa, Inter, sans-serif');
  });

  it('resolves TS values (colours → unrounded string, numbers stay numbers)', () => {
    expect(resolveTsValue({ colorSpace: 'oklab', components: [0.5, 0, 0] })).toBe('oklab(0.5 0 0)');
    expect(resolveTsValue(700)).toBe(700);
    expect(resolveTsValue('1rem')).toBe('1rem');
  });
});

describe('alias helpers', () => {
  const document_ = { font: { size: { md: { $value: '1rem' } } } };

  it('detects aliases and converts them to CSS variables', () => {
    expect(isAlias('{font.size.md}')).toBe(true);
    expect(isAlias('1rem')).toBe(false);
    expect(aliasToCssVariable('{font.size.4xl}', 'mp')).toBe('var(--mp-font-size-4xl)');
  });

  it('resolves an alias to its literal `$value`', () => {
    expect(resolveAlias('{font.size.md}', document_)).toBe('1rem');
    expect(resolveAlias('{font.size.missing}', document_)).toBeUndefined();
  });
});
