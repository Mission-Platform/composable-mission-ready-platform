import { describe, expect, it } from 'vitest';

import { expectSsrParity } from '@/test-utils/ssr-parity';

import { ForgeIcon } from './forge-icon';

describe('ForgeIcon', () => {
  it('resolves catalog names, maps size, and applies accessible wrapper semantics', async () => {
    const { html } = await expectSsrParity(ForgeIcon, {
      name: 'forge-icon-check',
      size: 'lg',
      ariaLabel: 'Done',
      color: 'rebeccapurple',
    });

    expect(html).toContain('forge-icon');
    expect(html).toContain('aria-label="Done"');
    expect(html).toContain('forge-icon-check');
    expect(html).toContain('width="24"');
    expect(html).toContain('height="24"');
  });

  it('resolves short names through the generated catalog namespace', async () => {
    const { html } = await expectSsrParity(ForgeIcon, { name: 'map-pin' });

    expect(html).toContain('forge-icon-map-pin');
    expect(html).toContain('aria-hidden="true"');
  });

  it('falls back safely and hides decorative icons', async () => {
    const { html } = await expectSsrParity(ForgeIcon, { name: 'missing-icon' });

    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('forge-icon-alert');
  });
});
