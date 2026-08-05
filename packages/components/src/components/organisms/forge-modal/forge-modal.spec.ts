import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeModal } from './forge-modal';

/**
 * Exercises the **neutral** `ForgeModal` authored in this package, rendering it
 * on both frameworks through the `@mission-platform/forge` runtime adapters. The
 * component is a native `<dialog>` whose content always ships in the markup
 * (the UA hides it until `showModal()` runs on the client); the size variant,
 * title, body, footer, and close control must match across React and Vue.
 */
const ReactModal = toReactComponent(ForgeModal, 'Modal');
const VueModal = toVueComponent(ForgeModal, 'Modal');

describe('ForgeModal authors the same component for React and Vue', () => {
  it('renders the sized dialog with title, body, footer, and close control on both frameworks', async () => {
    const react = renderToStaticMarkup(
      createElement(
        ReactModal,
        { open: true, title: 'Settings', size: 'lg', closeLabel: 'Close', footer: 'Footer actions' },
        'Modal body',
      ),
    );
    const vue = await renderToString(
      createSSRApp({
        render: () =>
          vueH(
            VueModal,
            { open: true, title: 'Settings', size: 'lg', closeLabel: 'Close', footer: 'Footer actions' },
            () => 'Modal body',
          ),
      }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('<dialog');
      expect(html).toContain('forge-modal--lg');
      expect(html).toContain('aria-label="Settings"');
      expect(html).toContain('forge-modal__header');
      expect(html).toContain('Settings');
      expect(html).toContain('forge-modal__body');
      expect(html).toContain('Modal body');
      expect(html).toContain('forge-modal__footer');
      expect(html).toContain('Footer actions');
      expect(html).toContain('aria-label="Close"');
    }
  });

  it('omits the header and footer regions when not supplied on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactModal, { open: true }, 'Body only'));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueModal, { open: true }, () => 'Body only') }));

    for (const html of [react, vue]) {
      expect(html).toContain('Body only');
      expect(html).not.toContain('forge-modal__header');
      expect(html).not.toContain('forge-modal__footer');
    }
  });
});
