// Regression test for the snippets drawer in the My Care Notes app shell.
//
// The drawer's visibility is driven entirely by the URL query
// (`?panel=snippets`). This test mounts the real `app.vue` with the
// heavy/contextual dependencies stubbed, and asserts the `ForgeDrawer` it
// renders opens for the `?panel=snippets` query and stays closed otherwise.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp, defineComponent, h, ref } from 'vue';

// Capture the props the app passes to ForgeDrawer.
let receivedDrawerProperties: Record<string, unknown> = {};

// Shared empty render function (kept at module scope to satisfy lint rules).
const renderEmpty = () => h('div');

const StubComponent = defineComponent({
  name: 'StubComponent',
  // Render every named slot so descendants (e.g. the drawer nested in the
  // application layout's `#content` slot) are actually mounted.
  setup(_properties, { slots }) {
    return () =>
      h(
        'div',
        Object.values(slots)
          .filter((slot): slot is NonNullable<typeof slot> => slot !== undefined)
          .map((slot) => slot()),
      );
  },
});

const ForgeDrawerStub = defineComponent({
  name: 'ForgeDrawerStub',
  // Mirror the public props the drawer relies on. The drawer's body contains a
  // virtual table with scoped slots that expect row data, so we deliberately do
  // not render the default slot — we only need to capture the props.
  props: ['open', 'placement', 'size', 'title'],
  setup(properties) {
    receivedDrawerProperties = properties;
    return renderEmpty;
  },
});

// Renders nothing. Used for components whose slots are *scoped* (e.g. the tabs'
// `#panel="{ tab }"` slot): the generic StubComponent would invoke them without
// the expected scope and blow up on `tab.id`, so we skip rendering them.
const EmptyComponent = defineComponent({
  name: 'EmptyComponent',
  setup: () => renderEmpty,
});

// Allow tests to drive the route query the component reads.
const routeQuery = ref<Record<string, unknown>>({});

vi.mock('@mission-platform/components', () => ({
  ForgeButton: StubComponent,
  ForgeDialog: StubComponent,
  ForgeDrawer: ForgeDrawerStub,
  ForgeIconButton: StubComponent,
  ForgeInput: StubComponent,
  ForgeMenubar: StubComponent,
  ForgeNavbar: StubComponent,
  ForgeNavbarItem: StubComponent,
  ForgeStack: StubComponent,
  ForgeTypography: StubComponent,
  ForgeThemeToggle: StubComponent,
  ForgeVirtualTable: StubComponent,
  ForgeVirtualTabs: EmptyComponent,
  ForgeLanguageSwitcher: StubComponent,
}));

vi.mock('@mission-platform/layouts', () => ({
  ForgeVerticalLayout: StubComponent,
}));

vi.mock('@mission-platform/i18n', () => ({
  ForgeLanguageSwitcher: StubComponent,
  useI18n: () => ({
    t: (_key: unknown, options?: { defaultValue?: string }) => options?.defaultValue ?? '',
    locale: ref('en'),
    setLocale: vi.fn(),
  }),
}));

vi.mock('@mission-platform/icons', () => ({
  ForgeIconDownload: StubComponent,
  ForgeIconPencil: StubComponent,
}));

vi.mock('@mission-platform/seo', () => ({
  useSeo: vi.fn(),
  organizationId: (url: string) => url,
  webPage: (input: Record<string, unknown>) => input,
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({
    get query() {
      return routeQuery.value;
    },
  }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('./components/monaco-editor.vue', () => ({ default: StubComponent }));
vi.mock('./components/snippet-editor-modal.vue', () => ({ default: StubComponent, __v_isVNode: false }));

vi.mock('./composables/use-snippets', () => ({
  useSnippets: () => ({
    snippets: ref([]),
    addSnippet: vi.fn(),
    updateSnippet: vi.fn(),
    removeSnippet: vi.fn(),
    exportSnippet: vi.fn(),
    exportAllSnippets: vi.fn(),
    importSnippet: vi.fn(),
    importAllSnippets: vi.fn(),
  }),
}));

vi.mock('./composables/use-tabs', () => ({
  useTabs: () => ({
    activeTabId: ref<string>(),
    openTabs: () => [],
    closedTabs: [],
    addTab: vi.fn(),
    closeTab: vi.fn(),
    restoreTab: vi.fn(),
    updateTabContent: vi.fn(),
    updateTabTitle: vi.fn(),
    setActiveTab: vi.fn(),
    exportTab: vi.fn(),
    importTab: vi.fn(),
  }),
}));

async function mountApp(query: Record<string, unknown>) {
  routeQuery.value = query;
  const { default: App } = await import('./app.vue');
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp(App);
  app.mount(host);
  await Promise.resolve();
  return () => {
    app.unmount();
    host.remove();
  };
}

afterEach(() => {
  receivedDrawerProperties = {};
});

describe('MyCareNotesApp snippets drawer', () => {
  it('opens the drawer for the ?panel=snippets query', async () => {
    const cleanup = await mountApp({ panel: 'snippets' });
    expect(receivedDrawerProperties['open']).toBe(true);
    cleanup();
  });

  it('keeps the drawer closed without the panel query', async () => {
    const cleanup = await mountApp({});
    expect(receivedDrawerProperties['open']).toBe(false);
    cleanup();
  });
});
