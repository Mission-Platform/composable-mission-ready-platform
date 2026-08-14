import { describe, expect, it, vi } from 'vitest';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { renderRoot } from './app-root';

vi.mock('vue-router', () => ({
  RouterView: {},
}));

describe('website root', () => {
  it('provides the icon symbols used by the route tree', async () => {
    const html = await renderToString(createSSRApp({ render: renderRoot }));

    expect(html).toContain('<symbol id="icon-language"');
  });
});
