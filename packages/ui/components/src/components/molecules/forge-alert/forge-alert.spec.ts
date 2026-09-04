import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeAlert } from './forge-alert';

const ReactAlert = toReactComponent(ForgeAlert, 'Alert');
const VueAlert = toVueComponent(ForgeAlert, 'Alert');

describe('ForgeAlert', () => {
  it('renders the message and accessible alert on both frameworks', async () => {
    const react = renderToStaticMarkup(
      createElement(ReactAlert, { title: 'Notice', children: 'Updated', type: 'success' }),
    );
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueAlert, { title: 'Notice', children: 'Updated', type: 'success' }) }),
    );
    for (const html of [react, vue]) {
      expect(html).toContain('role="status"');
      expect(html).toContain('Notice');
      expect(html).toContain('Updated');
    }
  });

  it('renders a labelled dismiss control when requested', () => {
    const html = renderToStaticMarkup(createElement(ReactAlert, { dismissible: true, children: 'Text' }));
    expect(html).toContain('aria-label="Dismiss"');
  });
});
