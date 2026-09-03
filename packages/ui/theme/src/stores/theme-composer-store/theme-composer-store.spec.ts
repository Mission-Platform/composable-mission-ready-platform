import { describe, expect, it } from 'vitest';

import {
  ATTRIBUTE_TO_CSS_VAR,
  configToCssVariables,
  configToStyleString,
  cssVariablesToString,
  mergeConfig,
  removeConfigToken,
  setConfigAttribute,
  setConfigToken,
} from './theme-composer-store';

describe('theme-composer-store helpers', () => {
  it('maps friendly attributes to --mp-* custom properties', () => {
    expect(ATTRIBUTE_TO_CSS_VAR.primaryColor).toBe('--mp-color-primary-default');
    expect(ATTRIBUTE_TO_CSS_VAR.radius).toBe('--mp-radius-md');

    const variables = configToCssVariables({
      primaryColor: '#112233',
      textColor: '#eee',
      tokens: {
        'color-bg-base': '#000',
        '--mp-radius-lg': '12px',
        empty: '',
      },
    });

    expect(variables).toEqual({
      '--mp-color-primary-default': '#112233',
      '--mp-color-text-primary': '#eee',
      '--mp-color-bg-base': '#000',
      '--mp-radius-lg': '12px',
    });
  });

  it('serialises variables and color-scheme into an inline style string', () => {
    expect(cssVariablesToString({ '--mp-radius-md': '4px' })).toBe('--mp-radius-md: 4px;');
    expect(configToStyleString({ radius: '8px' })).toBe('--mp-radius-md: 8px;');
    expect(configToStyleString({ colorScheme: 'dark' })).toBe('color-scheme: dark;');
    expect(configToStyleString({ radius: '8px', colorScheme: 'light dark' })).toBe(
      '--mp-radius-md: 8px; color-scheme: light dark;',
    );
  });

  it('merges configs and mutates attributes/tokens immutably', () => {
    const base = { primaryColor: 'red', tokens: { a: '1' } };
    expect(mergeConfig(base, { textColor: 'blue' })).toEqual({
      primaryColor: 'red',
      textColor: 'blue',
      tokens: { a: '1' },
    });

    const withAttribute = setConfigAttribute(base, 'radius', '4px');
    expect(withAttribute.radius).toBe('4px');
    expect(base).not.toHaveProperty('radius');

    const withToken = setConfigToken(base, 'spacing-md', '1rem');
    expect(withToken.tokens).toEqual({ a: '1', 'spacing-md': '1rem' });

    const removed = removeConfigToken(withToken, 'a');
    expect(removed.tokens).toEqual({ 'spacing-md': '1rem' });
    expect(removeConfigToken(base, 'missing')).toBe(base);
  });
});
