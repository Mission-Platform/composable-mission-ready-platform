import { toReactComponent } from '@mission-platform/jsx/react';
import { toVueComponent } from '@mission-platform/jsx/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseModal } from './base-modal';

/**
 * Exercises the **neutral** `BaseModal` authored in this package, rendering it
 * on both frameworks through the `@mission-platform/jsx` runtime adapters. The
 * component is a native `<dialog>` whose content always ships in the markup
 * (the UA hides it until `showModal()` runs on the client); the size variant,
 * title, body, footer, and close control must match across React and Vue.
 */
const ReactModal = toReactComponent(BaseModal, 'Modal');
const VueModal = toVueComponent(BaseModal, 'Modal');

describe('BaseModal authors the same component for React and Vue', () => {
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
      expect(html).toContain('base-modal--lg');
      expect(html).toContain('aria-label="Settings"');
      expect(html).toContain('base-modal__header');
      expect(html).toContain('Settings');
      expect(html).toContain('base-modal__body');
      expect(html).toContain('Modal body');
      expect(html).toContain('base-modal__footer');
      expect(html).toContain('Footer actions');
      expect(html).toContain('aria-label="Close"');
    }
  });

  it('omits the header and footer regions when not supplied on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactModal, { open: true }, 'Body only'));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueModal, { open: true }, () => 'Body only') }));

    for (const html of [react, vue]) {
      expect(html).toContain('Body only');
      expect(html).not.toContain('base-modal__header');
      expect(html).not.toContain('base-modal__footer');
    }
  });
});
