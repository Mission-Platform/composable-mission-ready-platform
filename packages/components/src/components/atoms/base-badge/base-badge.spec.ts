import { describe, expect, it } from 'vitest';

import { expectSsrParity } from '../../../test-utils/ssr-parity';

import { BaseBadge } from './base-badge';

/**
 * Exercises the **neutral** `BaseBadge` authored in this package, rendering it
 * on both frameworks through the `@mission-platform/forge` runtime adapters via
 * the shared {@link expectSsrParity} helper. That keeps the assertions
 * independent of the build-time plugin (whose React/Vue parity is covered in
 * `@mission-platform/vite-plugin-forge`), while proving the component itself is
 * correct and framework-portable: the helper asserts the React and Vue SSR
 * output is the **same DOM** before the per-component assertions run.
 */
describe('BaseBadge authors the same component for React and Vue', () => {
  it('renders to matching markup on both frameworks', async () => {
    const { html } = await expectSsrParity(BaseBadge, { variant: 'primary', size: 'lg' }, 'New');

    expect(html).toContain('base-badge');
    expect(html).toContain('base-badge--primary');
    expect(html).toContain('base-badge--lg');
    expect(html).toContain('New');
  });
});
