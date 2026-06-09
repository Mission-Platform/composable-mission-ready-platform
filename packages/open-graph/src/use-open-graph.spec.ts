import { createHead, renderDOMHead } from '@unhead/vue/client';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp, defineComponent, h, nextTick, ref } from 'vue';

import { useOpenGraph } from './use-open-graph';

import type { OpenGraphMetadata } from './types';

const renderEmpty = (): unknown => h('div');

beforeEach(() => {
  document.head.innerHTML = '';
  document.title = '';
});

/**
 * Mount a small component that invokes {@link useOpenGraph} inside a Vue app
 * with `@unhead/vue` installed, and return helpers for asserting on the
 * resulting `<head>` and tearing the app down.
 */
function mountWithOg(setup: () => void) {
  const head = createHead();
  const App = defineComponent({
    setup() {
      setup();
      return renderEmpty;
    },
  });
  const app = createApp(App);
  app.use(head);
  const root = document.createElement('div');
  app.mount(root);
  return { app, head };
}

describe('useOpenGraph', () => {
  it('applies static metadata to <head>', async () => {
    const { app, head } = mountWithOg(() => {
      useOpenGraph({ title: 'Static', description: 'Page' });
    });
    await nextTick();
    await renderDOMHead(head);

    expect(document.head.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe('Static');
    expect(document.head.querySelector('meta[property="og:description"]')?.getAttribute('content')).toBe('Page');
    app.unmount();
  });

  it('reacts to changes in a ref and updates existing tags in place', async () => {
    const meta = ref<OpenGraphMetadata>({ title: 'A' });
    const { app, head } = mountWithOg(() => {
      useOpenGraph(meta);
    });
    await nextTick();
    await renderDOMHead(head);

    expect(document.head.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe('A');

    meta.value = { title: 'B', description: 'D' };
    await nextTick();
    await renderDOMHead(head);

    expect(document.head.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe('B');
    expect(document.head.querySelector('meta[property="og:description"]')?.getAttribute('content')).toBe('D');
    app.unmount();
  });

  it('optionally syncs the document <title>', async () => {
    const { app, head } = mountWithOg(() => {
      useOpenGraph({ title: 'Page title' }, { updateDocumentTitle: true });
    });
    await nextTick();
    await renderDOMHead(head);

    expect(document.title).toBe('Page title');
    app.unmount();
  });

  it('removes owned tags when the app is unmounted', async () => {
    const { app, head } = mountWithOg(() => {
      useOpenGraph({ title: 'Temp', description: 'Bye' });
    });
    await nextTick();
    await renderDOMHead(head);

    expect(document.head.querySelector('meta[property="og:title"]')).not.toBeNull();

    app.unmount();
    await nextTick();
    await renderDOMHead(head);

    expect(document.head.querySelector('meta[property="og:title"]')).toBeNull();
  });
});
