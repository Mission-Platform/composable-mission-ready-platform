import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp, createSSRApp, h as vueH, nextTick } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeTagInput } from './forge-tag-input';

const ReactTagInput = toReactComponent(ForgeTagInput, 'TagInput');
const VueTagInput = toVueComponent(ForgeTagInput, 'TagInput');

describe('ForgeTagInput authors the same component for React and Vue', () => {
  it('renders existing tags and an accessible input on both frameworks', async () => {
    const properties = { modelValue: ['Vue', 'React'], label: 'Frameworks', id: 'tags-1' };
    const react = renderToStaticMarkup(createElement(ReactTagInput, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueTagInput, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('Frameworks');
      expect(html).toContain('Vue');
      expect(html).toContain('React');
      expect(html).toContain('id="tags-1"');
      expect(html).toContain('aria-label="Remove Vue"');
    }
  });

  it('marks loading input as busy and disabled without hiding current tags', async () => {
    const properties = { modelValue: ['Pending'], label: 'Tags', loading: true };
    const react = renderToStaticMarkup(createElement(ReactTagInput, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueTagInput, properties) }));

    for (const html of [react, vue]) {
      expect(html).toContain('Pending');
      expect(html).toContain('aria-busy="true"');
      expect(html).toContain('disabled');
      expect(html).toContain('role="status"');
    }
  });

  it('announces an error and associates it with the input', () => {
    const html = renderToStaticMarkup(createElement(ReactTagInput, { error: 'Duplicate tag', id: 'tags-error' }));
    expect(html).toContain('aria-describedby="tags-error-error"');
    expect(html).toContain('role="alert"');
  });

  it('commits a trimmed delimiter value, rejects duplicates, and removes with backspace', async () => {
    const onUpdateModelValue = vi.fn();
    const host = document.createElement('div');
    document.body.append(host);
    const app = createApp({
      render: () => vueH(VueTagInput, { modelValue: ['Vue'], onUpdateModelValue, id: 'tags-2' }),
    });

    app.mount(host);

    const input = host.querySelector('input');
    expect(input).not.toBeNull();
    if (!input) return;

    input.value = ' React, ';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: ',', bubbles: true }));
    await nextTick();
    expect(onUpdateModelValue).toHaveBeenLastCalledWith(['Vue', 'React']);

    input.value = 'Vue';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await nextTick();
    expect(onUpdateModelValue).toHaveBeenCalledTimes(1);

    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));
    await nextTick();
    expect(onUpdateModelValue).toHaveBeenLastCalledWith([]);

    app.unmount();
    host.remove();
  });
});

afterEach(() => {
  document.body.replaceChildren();
});
