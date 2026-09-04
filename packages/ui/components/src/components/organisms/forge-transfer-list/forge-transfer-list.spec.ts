import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createApp, createSSRApp, h as vueH, nextTick } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeTransferList } from './forge-transfer-list';

const ReactTransferList = toReactComponent(ForgeTransferList, 'TransferList');
const VueTransferList = toVueComponent(ForgeTransferList, 'TransferList');

describe('ForgeTransferList', () => {
  it('renders two labelled selectable lists and transfer controls on both frameworks', async () => {
    const properties = {
      sourceItems: [
        { id: 'one', label: 'One' },
        { id: 'two', label: 'Two' },
      ],
      modelValue: ['two'],
      titles: { source: 'Available', target: 'Selected' },
      searchable: true,
      maxSelections: 1,
    };
    const react = renderToStaticMarkup(createElement(ReactTransferList, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueTransferList, properties) }));
    for (const html of [react, vue]) {
      expect(html).toContain('One');
      expect(html).toContain('Two');
      expect(html).toContain('aria-label="Available"');
      expect(html).toContain('aria-label="Selected"');
      expect(html).toContain('aria-label="Move selected right"');
      expect(html).toContain('Search available');
    }
  });

  it('updates the model and refuses to exceed maxSelections', async () => {
    const onUpdateModelValue = vi.fn();
    const host = document.createElement('div');
    document.body.append(host);
    const app = createApp({
      render: () =>
        vueH(VueTransferList, {
          sourceItems: [
            { id: 'one', label: 'One' },
            { id: 'two', label: 'Two' },
          ],
          searchable: false,
          maxSelections: 1,
          onUpdateModelValue,
        }),
    });
    app.mount(host);
    const checkboxes = [...host.querySelectorAll('input[type="checkbox"]')] as HTMLInputElement[];
    checkboxes[0]?.click();
    await nextTick();
    host.querySelector('[aria-label="Move selected right"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await nextTick();
    expect(onUpdateModelValue).toHaveBeenCalledWith([]);
    expect(host.textContent).toContain('One');
    app.unmount();
    host.remove();
  });
});
