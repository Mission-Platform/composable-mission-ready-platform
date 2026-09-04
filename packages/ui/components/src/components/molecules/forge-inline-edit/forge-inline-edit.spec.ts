import { toReactComponent } from '@mission-platform/forge-adapters/react';
import { toVueComponent } from '@mission-platform/forge-adapters/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createApp, createSSRApp, h as vueH, nextTick } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeInlineEdit } from './forge-inline-edit';

const ReactInlineEdit = toReactComponent(ForgeInlineEdit, 'InlineEdit');
const VueInlineEdit = toVueComponent(ForgeInlineEdit, 'InlineEdit');
describe('ForgeInlineEdit', () => {
  it('renders display mode on both frameworks', async () => {
    const properties = { modelValue: 'Project', label: 'Name' };
    const react = renderToStaticMarkup(createElement(ReactInlineEdit, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueInlineEdit, properties) }));
    for (const html of [react, vue]) {
      expect(html).toContain('Project');
      expect(html).toContain('aria-label="Edit"');
    }
  });
  it('renders the editor and required constraint when initially editing', () => {
    const html = renderToStaticMarkup(
      createElement(ReactInlineEdit, { defaultEditing: true, modelValue: '', required: true }),
    );
    expect(html).toContain('<form');
    expect(html).toContain('required');
    expect(html).toContain('Save');
  });

  it('associates a labeled editor with its generated error target', () => {
    const html = renderToStaticMarkup(
      createElement(ReactInlineEdit, {
        defaultEditing: true,
        error: 'Invalid name',
        id: 'project-name',
        label: 'Name',
        modelValue: 'Project',
      }),
    );
    expect(html).toContain('id="project-name"');
    expect(html).toContain('aria-labelledby="project-name-label"');
    expect(html).toContain('id="project-name-error"');
  });

  it('cancels editing with Escape', async () => {
    const onCancel = vi.fn();
    const host = document.createElement('div');
    document.body.append(host);
    const app = createApp({
      render: () => vueH(VueInlineEdit, { defaultEditing: true, modelValue: 'Project', onCancel }),
    });
    app.mount(host);

    const input = host.querySelector('input');
    expect(input).not.toBeNull();
    if (!input) return;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await nextTick();

    expect(onCancel).toHaveBeenCalledOnce();
    app.unmount();
    host.remove();
  });
});
