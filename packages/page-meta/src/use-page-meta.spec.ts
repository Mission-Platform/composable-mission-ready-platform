import { createHead, renderDOMHead } from '@unhead/vue/client';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp, defineComponent, h, nextTick, ref } from 'vue';

import { usePageMeta } from './use-page-meta';

const renderEmpty = (): unknown => h('div');

beforeEach(() => {
  document.head.innerHTML = '';
  document.title = '';
  document.documentElement.removeAttribute('lang');
});

/**
 * Mount a Vue app with `@unhead/vue` installed and run the provided setup
 * function (which is expected to call {@link usePageMeta}).
 */
function mountWithPageMeta(setup: () => void) {
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

describe('usePageMeta', () => {
  it('applies static metadata to the document head', async () => {
    const { app, head } = mountWithPageMeta(() => {
      usePageMeta({ title: 'Home', description: 'desc', language: 'en-AU' });
    });
    await nextTick();
    await renderDOMHead(head);

    expect(document.title).toBe('Home');
    expect(document.documentElement.getAttribute('lang')).toBe('en-AU');
    expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('desc');
    app.unmount();
  });

  it('reactively updates when a ref changes', async () => {
    const meta = ref<{ title: string; description: string }>({ title: 'A', description: 'one' });
    const { app, head } = mountWithPageMeta(() => {
      usePageMeta(meta);
    });
    await nextTick();
    await renderDOMHead(head);

    expect(document.title).toBe('A');

    meta.value = { title: 'B', description: 'two' };
    await nextTick();
    await renderDOMHead(head);

    expect(document.title).toBe('B');
    expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('two');
    app.unmount();
  });

  it('removes owned tags when the app is unmounted', async () => {
    const { app, head } = mountWithPageMeta(() => {
      usePageMeta({ title: 'Gone', description: 'temp' });
    });
    await nextTick();
    await renderDOMHead(head);

    expect(document.head.querySelector('meta[name="description"]')).not.toBeNull();

    app.unmount();
    await nextTick();
    await renderDOMHead(head);

    expect(document.head.querySelector('meta[name="description"]')).toBeNull();
  });
});
