import { describe, expect, it } from 'vitest';

import { createForgeStyle } from './types.js';

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
