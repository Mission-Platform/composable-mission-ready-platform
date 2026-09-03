import { describe, expect, it } from 'vitest';

import { componentPathToCssVariable, normalizeComponentTokenPath, resolveFigmaVariable } from './resolve';

describe('Mission Platform component tokens', () => {
  it('normalizes canonical paths and generated CSS variables', () => {
    expect(normalizeComponentTokenPath('Mission Platform / Component / button / primary / background / hover')).toBe(
      'component.button.primary.background.hover',
    );
    expect(componentPathToCssVariable('component.button.primary.background.hover')).toBe(
      '--mp-button-primary-background-hover',
    );
  });

  it('preserves aliases and Light/Dark mode metadata', () => {
    const result = resolveFigmaVariable({
      name: 'Button Fill',
      alias: 'component.button.primary.background.hover',
      collection: 'Mission Platform / Component',
      mode: 'Light',
      resolvedValue: '#fff',
    });

    expect(result.reference).toMatchObject({
      path: 'component.button.primary.background.hover',
      cssVariable: '--mp-button-primary-background-hover',
      modes: ['light'],
      aliasPath: 'component.button.primary.background.hover',
    });
    expect(result.fallback).toBeUndefined();
    expect(result.diagnostics).toHaveLength(0);
  });

  it('emits a warning and raw fallback for an unbound variable', () => {
    const result = resolveFigmaVariable({ name: 'Local Fill', resolvedValue: '#abc' });

    expect(result.reference).toBeUndefined();
    expect(result.fallback).toEqual({ value: '#abc', reason: 'missing-path' });
    expect(result.diagnostics[0]).toMatchObject({ severity: 'warning', feature: 'token', code: 'TOKEN_RAW_VALUE' });
  });
});
