import { describe, expect, it } from 'vitest';

import { expectSsrParity } from '@/test-utils/ssr-parity';

import { ForgeKbd } from './forge-kbd';

describe('ForgeKbd', () => {
  it('renders default-slot text with size and pressed modifiers', async () => {
    const { html } = await expectSsrParity(ForgeKbd, { size: 'lg', pressed: true }, 'Ctrl + K');

    expect(html).toContain('<kbd');
    expect(html).toContain('forge-kbd--lg');
    expect(html).toContain('forge-kbd--pressed');
    expect(html).toContain('Ctrl + K');
  });
});
