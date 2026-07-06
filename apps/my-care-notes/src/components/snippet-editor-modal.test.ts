// Regression test for the snippet editor modal.
//
// The modal's visibility is driven entirely by the URL query (`?overlay=…`).
// These tests mount the real component with the heavy/contextual dependencies
// stubbed, and assert the `BaseModal` it renders is open for the relevant
// overlay query and stays closed otherwise.

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
  props: ['open', 'title', 'size'],
  setup(properties, { slots }) {
    receivedModalProperties = properties;
    return () => h('div', [slots['default']?.(), slots['footer']?.()]);
  },
});

// Allow tests to drive the route query the component reads.
const routeQuery = ref<Record<string, unknown>>({});

vi.mock('@mission-platform/components/vue', () => ({
  BaseButton: StubComponent,
  BaseInput: StubComponent,
  BaseModal: BaseModalStub,
  BaseMonacoEditor: StubComponent,
  BaseStack: StubComponent,
}));

vi.mock('@mission-platform/i18n/vue', () => ({
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
});
