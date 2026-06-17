// Regression test for the snippet editor modal.
//
// The modal's visibility is driven entirely by the URL query (`?overlay=…`).
// `BaseModal` auto-closes on every route change by default (`closeOnRouteChange`),
// which means the very navigation that opens the modal would immediately close it
// again — so neither the "new" nor the "edit" snippet modal could ever open.
//
// These tests mount the real component with the heavy/contextual dependencies
// stubbed, and assert the `BaseModal` it renders is (a) open for the relevant
// overlay query and (b) explicitly opts out of close-on-route-change.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp, defineComponent, h, ref } from 'vue';

// Capture the props the component passes to BaseModal.
let receivedModalProperties: Record<string, unknown> = {};

const StubComponent = defineComponent({
  name: 'StubComponent',
  setup(_properties, { slots }) {
    return () => h('div', slots['default'] ? slots['default']() : []);
  },
});

const BaseModalStub = defineComponent({
  name: 'BaseModalStub',
  // Mirror the public props the modal relies on.
  props: ['open', 'title', 'size', 'closeOnRouteChange'],
  setup(properties, { slots }) {
    receivedModalProperties = properties;
    return () => h('div', [slots['default']?.(), slots['footer']?.()]);
  },
});

// Allow tests to drive the route query the component reads.
const routeQuery = ref<Record<string, unknown>>({});

vi.mock('@mission-platform/components', () => ({
  BaseButton: StubComponent,
  BaseInput: StubComponent,
  BaseModal: BaseModalStub,
  BaseStack: StubComponent,
}));

vi.mock('@mission-platform/components/monaco', () => ({
  BaseMonacoEditor: StubComponent,
}));

vi.mock('@mission-platform/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({
    get query() {
      return routeQuery.value;
    },
  }),
}));

vi.mock('../composables/use-monaco-theme', () => ({
  useMonacoTheme: () => ({ monacoTheme: ref('vs') }),
}));

vi.mock('../composables/use-snippets', () => ({
  useSnippets: () => ({ snippets: ref([]) }),
}));

async function mountModal(query: Record<string, unknown>) {
  routeQuery.value = query;
  const { default: SnippetEditorModal } = await import('./snippet-editor-modal.vue');
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp(SnippetEditorModal);
  app.mount(host);
  await Promise.resolve();
  return () => {
    app.unmount();
    host.remove();
  };
}

afterEach(() => {
  receivedModalProperties = {};
});

describe('SnippetEditorModal', () => {
  it('opens for the new-snippet overlay query', async () => {
    const cleanup = await mountModal({ overlay: 'snippet-new' });
    expect(receivedModalProperties['open']).toBe(true);
    cleanup();
  });

  it('opens for the edit-snippet overlay query', async () => {
    const cleanup = await mountModal({ overlay: 'snippet-edit', id: 'abc' });
    expect(receivedModalProperties['open']).toBe(true);
    cleanup();
  });

  it('stays closed without an overlay query', async () => {
    const cleanup = await mountModal({});
    expect(receivedModalProperties['open']).toBe(false);
    cleanup();
  });

  it('opts the route-driven modal out of close-on-route-change', async () => {
    // The fix: without this, the navigation that sets `?overlay=…` would
    // immediately trigger BaseModal's auto-close, so the modal never opens.
    const cleanup = await mountModal({ overlay: 'snippet-new' });
    expect(receivedModalProperties['closeOnRouteChange']).toBe(false);
    cleanup();
  });
});
