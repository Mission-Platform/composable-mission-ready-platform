import { describe, expect, it } from 'vitest';

import { expectSsrParity } from '@/test-utils/ssr-parity';

import { ForgeSurface } from './forge-surface';

describe('ForgeSurface', () => {
  it('renders the selected elevation, padding, rounded, and root element modifiers', async () => {
    const { html } = await expectSsrParity(
      ForgeSurface,
      { as: 'article', elevation: 3, padding: 'lg', rounded: 'xl' },
      'Panel',
    );

    expect(html).toContain('<article');
    expect(html).toContain('forge-surface--elevation-3');
    expect(html).toContain('forge-surface--padding-lg');
    expect(html).toContain('forge-surface--rounded-xl');
    expect(html).toContain('Panel');
  });
});
