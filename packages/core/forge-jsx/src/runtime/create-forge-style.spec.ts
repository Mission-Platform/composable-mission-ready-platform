import { describe, expect, it } from 'vitest';

import { createForgeComponentStyle, createForgeStyle } from './types.js';

describe('createForgeStyle', () => {
  it('omits undefined custom properties so SCSS fallbacks remain active', () => {
    const style = createForgeStyle({
      '--forge-button-gap': '8px',
      '--forge-button-radius': undefined,
    });

    expect(style).toEqual({ '--forge-button-gap': '8px' });
    expect(style).not.toHaveProperty('--forge-button-radius');
  });

  it('returns undefined when no overrides are defined', () => {
    expect(
      createForgeStyle({
        '--forge-button-gap': undefined,
      }),
    ).toBeUndefined();
  });
});

describe('createForgeComponentStyle', () => {
  it('automatically prefixes and maps camelCase and kebab-case property overrides', () => {
    const style = createForgeComponentStyle('button', {
      primaryGap: '12px',
      'secondary-border-default': '2px solid red',
      '--forge-button-font-size': '16px',
      disabledOpacity: undefined,
    });

    expect(style).toEqual({
      '--forge-button-primary-gap': '12px',
      '--forge-button-secondary-border-default': '2px solid red',
      '--forge-button-font-size': '16px',
    });
    expect(style).not.toHaveProperty('--forge-button-disabled-opacity');
  });

  it('returns undefined when properties is undefined or contains only undefined values', () => {
    expect(createForgeComponentStyle('button')).toBeUndefined();
    expect(createForgeComponentStyle('button', {})).toBeUndefined();
    expect(
      createForgeComponentStyle('button', {
        primaryGap: undefined,
        'secondary-border-default': undefined,
      }),
    ).toBeUndefined();
  });

  it('handles component name redundancy cleanly', () => {
    const style = createForgeComponentStyle('button', {
      'button-primary-gap': '14px',
    });

    expect(style).toEqual({
      '--forge-button-primary-gap': '14px',
    });
  });
});
