// Regression test for the snippets drawer in the My Care Notes app shell.
//
// The drawer's visibility is driven entirely by the URL query
// (`?panel=snippets`). `BaseDrawer` auto-closes on every route change by
// default (`closeOnRouteChange`), which means the very navigation that opens
// the drawer would immediately close it again — so the snippets panel could
// never stay open.
//
// This test mounts the real `app.vue` with the heavy/contextual dependencies
// stubbed, and asserts the `BaseDrawer` it renders (a) opens for the
// `?panel=snippets` query and (b) explicitly opts out of close-on-route-change.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp, defineComponent, h, ref } from 'vue';

// Capture the props the app passes to BaseDrawer.
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
          .filter((slot): slot is NonNullable<typeof slot> => slot != undefined)
          .map((slot) => slot()),
      );
  },
});

const BaseDrawerStub = defineComponent({
  name: 'BaseDrawerStub',
  // Mirror the public props the drawer relies on. The drawer's body contains a
  // virtual table with scoped slots that expect row data, so we deliberately do
  // not render the default slot — we only need to capture the props.
  props: ['open', 'placement', 'size', 'title', 'closeOnRouteChange'],
  setup(properties) {
    receivedDrawerProperties = properties;
    return renderEmpty;
  },
});

// Allow tests to drive the route query the component reads.
const routeQuery = ref<Record<string, unknown>>({});

vi.mock('@mission-platform/components', () => ({
  BaseApplicationLayout: StubComponent,
  BaseButton: StubComponent,
  BaseDialog: StubComponent,
  BaseDrawer: BaseDrawerStub,
  BaseIconButton: StubComponent,
  BaseInput: StubComponent,
  BaseMenubar: StubComponent,
  BaseNavbar: StubComponent,
  BaseNavbarItem: StubComponent,
  BaseStack: StubComponent,
  BaseThemeToggle: StubComponent,
  BaseVirtualTable: StubComponent,
  BaseVirtualTabs: StubComponent,
}));

vi.mock('@mission-platform/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

vi.mock('@mission-platform/icons', () => ({
  IconDownload: StubComponent,
  IconPencil: StubComponent,
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
vi.mock('./components/snippet-editor-modal.vue', () => ({ default: StubComponent }));

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
    activeTabId: ref(undefined),
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

  it('opts the route-driven drawer out of close-on-route-change', async () => {
    // The fix: without this, the navigation that sets `?panel=snippets` would
    // immediately trigger BaseDrawer's auto-close, so the drawer never opens.
    const cleanup = await mountApp({ panel: 'snippets' });
    expect(receivedDrawerProperties['closeOnRouteChange']).toBe(false);
    cleanup();
  });
});
