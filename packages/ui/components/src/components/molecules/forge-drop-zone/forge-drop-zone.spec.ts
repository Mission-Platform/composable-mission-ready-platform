import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createApp, createSSRApp, h as vueH, nextTick } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeDropZone } from './forge-drop-zone';

const ReactDropZone = toReactComponent(ForgeDropZone, 'DropZone');
const VueDropZone = toVueComponent(ForgeDropZone, 'DropZone');
describe('ForgeDropZone', () => {
  it('renders an accessible target and native file input on both frameworks', async () => {
    const properties = { id: 'uploads', label: 'Uploads', accept: 'image/*' };
    const react = renderToStaticMarkup(createElement(ReactDropZone, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueDropZone, properties) }));
    for (const html of [react, vue]) {
      expect(html).toContain('role="button"');
      expect(html).toContain('type="file"');
      expect(html).toContain('accept="image/*"');
    }
  });
  it('renders the configured file constraints', () => {
    const html = renderToStaticMarkup(
      createElement(ReactDropZone, { id: 'files', accept: 'image/*', maxSize: 1024, maxFiles: 2 }),
    );
    expect(html).toContain('accept="image/*"');
    expect(html).toContain('forge-drop-zone');
  });

  it('emits picker changes separately from drag-and-drop events', async () => {
    const onDrop = vi.fn();
    const host = document.createElement('div');
    document.body.append(host);
    const app = createApp({
      render: () => vueH(VueDropZone, { onDrop, id: 'uploads' }),
    });
    app.mount(host);

    const input = host.querySelector('input[type="file"]');
    expect(input).not.toBeNull();
    if (!input) return;
    const file = new File(['contents'], 'photo.png', { type: 'image/png' });
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await nextTick();

    expect(onDrop).toHaveBeenLastCalledWith([file]);

    const target = host.querySelector('[role="button"]');
    expect(target).not.toBeNull();
    if (!target) return;
    const drop = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(drop, 'dataTransfer', { value: { files: [file] } });
    target.dispatchEvent(drop);
    await nextTick();

    expect(onDrop).toHaveBeenLastCalledWith([file]);
    app.unmount();
    host.remove();
  });
});
