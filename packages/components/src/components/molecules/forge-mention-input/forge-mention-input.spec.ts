import { toReactComponent } from '@mission-platform/forge/react';
import { toVueComponent } from '@mission-platform/forge/vue';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { createApp, createSSRApp, h as vueH, nextTick } from 'vue';
import { renderToString } from 'vue/server-renderer';

import { ForgeMentionInput } from './forge-mention-input';

const ReactMentionInput = toReactComponent(ForgeMentionInput, 'MentionInput');
const VueMentionInput = toVueComponent(ForgeMentionInput, 'MentionInput');
describe('ForgeMentionInput', () => {
  it('renders an accessible textarea on both frameworks', async () => {
    const properties = {
      id: 'comment',
      label: 'Comment',
      hint: 'Use @ for mentions.',
      modelValue: '',
      items: [],
    };
    const react = renderToStaticMarkup(createElement(ReactMentionInput, properties));
    const vue = await renderToString(createSSRApp({ render: () => vueH(VueMentionInput, properties) }));
    for (const html of [react, vue]) {
      expect(html).toContain('aria-autocomplete="list"');
      expect(html).toContain('Comment');
      expect(html).toContain('Use @ for mentions.');
    }
  });
  it('associates an error with the textarea', () => {
    const html = renderToStaticMarkup(
      createElement(ReactMentionInput, { id: 'comment', error: 'Required', modelValue: '', items: [] }),
    );
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('role="alert"');
  });

  it('reports the current mention query as the user types', async () => {
    const onSearch = vi.fn();
    const host = document.createElement('div');
    document.body.append(host);
    const app = createApp({
      render: () =>
        vueH(VueMentionInput, {
          id: 'comment',
          modelValue: '',
          onSearch,
          items: [
            { id: '1', label: 'Ada' },
            { id: '2', label: 'Grace' },
          ],
        }),
    });
    app.mount(host);

    const textarea = host.querySelector('textarea');
    expect(textarea).not.toBeNull();
    if (!textarea) return;
    textarea.value = '@a';
    textarea.selectionStart = 2;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();
    expect(onSearch).toHaveBeenLastCalledWith('a');

    textarea.value = '@z';
    textarea.selectionStart = 2;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    await nextTick();

    expect(onSearch).toHaveBeenLastCalledWith('z');
    app.unmount();
    host.remove();
  });
});
