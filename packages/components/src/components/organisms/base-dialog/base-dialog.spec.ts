import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSSRApp, h as vueH } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { BaseDialog } from './base-dialog';

/**
 * Exercises the **neutral** `BaseDialog` authored in this package, rendering it
 * on both frameworks through the `@mission-platform/forge` runtime adapters. The
 * component is a native `<dialog>` whose content always ships in the markup
 * (the UA hides it until `showModal()` runs on the client); the title, body,
 * footer, and close control must match across React and Vue.
 */
const ReactDialog = toReactComponent(BaseDialog, 'Dialog');
const VueDialog = toVueComponent(BaseDialog, 'Dialog');

describe('BaseDialog authors the same component for React and Vue', () => {
  it('renders the native dialog with title, body, footer, and close control on both frameworks', async () => {
    const react = renderToStaticMarkup(
      createElement(
        ReactDialog,
        { open: true, title: 'Confirm', closeLabel: 'Close', footer: 'Footer actions' },
        'Dialog body',
      ),
    );
    const vue = await renderToString(
      createSSRApp({
        render: () =>
          vueH(
            VueDialog,
            { open: true, title: 'Confirm', closeLabel: 'Close', footer: 'Footer actions' },
            () => 'Dialog body',
          ),
      }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('<dialog');
      expect(html).toContain('base-dialog__header');
      expect(html).toContain('Confirm');
      expect(html).toContain('base-dialog__body');
      expect(html).toContain('Dialog body');
      expect(html).toContain('base-dialog__footer');
      expect(html).toContain('Footer actions');
      expect(html).toContain('aria-label="Close"');
    }
  });

  it('omits the header and footer regions when not supplied on both frameworks', async () => {
    const react = renderToStaticMarkup(createElement(ReactDialog, { open: true }, 'Body only'));
    const vue = await renderToString(
      createSSRApp({ render: () => vueH(VueDialog, { open: true }, () => 'Body only') }),
    );

    for (const html of [react, vue]) {
      expect(html).toContain('Body only');
      expect(html).not.toContain('base-dialog__header');
      expect(html).not.toContain('base-dialog__footer');
    }
  });
});
