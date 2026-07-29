import { h, markRaw, ref } from 'vue';

import { VirtualTabs } from '@mission-platform/components/vue';

import type { TabItem } from '../base-tabs';
import type { Meta, StoryObj } from '@storybook/vue3-vite';

const tabs: TabItem[] = [
  { id: 'inbox', label: 'Inbox' },
  { id: 'sent', label: 'Sent' },
  { id: 'drafts', label: 'Drafts' },
];

/**
 * `VirtualTabs` is the Vue 3 build of the write-once `BaseVirtualTabs` in this
 * package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/jsx`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-jsx`. The very same source also
 * ships as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Navigation/BaseVirtualTabs',
  component: VirtualTabs,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `VirtualTabs` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). It behaves like `Tabs` but mounts **only the active tab\u2019s panel** (virtualised), suited to heavy panel content. The original `BaseTabList` sub-component is inlined, the icons become `+`/`✕` glyphs, the per-tab-id named panel slot becomes one scoped `panel` slot, and `v-model` + emits become callback props. Styling comes from the co-located `base-virtual-tabs.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    variant: { control: 'inline-radio', options: ['line', 'pill'] },
    closable: { control: 'boolean' },
    addable: { control: 'boolean' },
  },
  args: {
    tabs,
    variant: 'line',
    closable: false,
    addable: false,
  },
  render: (arguments_) => ({
    components: { VirtualTabs },
    setup() {
      const active = ref(arguments_.modelValue ?? 'inbox');
      // `panel` is a render-prop (not a Vue slot): it receives `{ tab }` and
      // returns the active panel's content as VNodes.
      const panel = markRaw(({ tab }: { tab: TabItem }) =>
        h('p', { style: 'margin: 0;' }, ['Virtualised content for ', h('strong', tab.label), '.']),
      );
      return {
        tabs: arguments_.tabs,
        variant: arguments_.variant,
        closable: arguments_.closable,
        addable: arguments_.addable,
        active,
        panel,
      };
    },
    template: `
      <VirtualTabs :tabs="tabs" :variant="variant" :closable="closable" :addable="addable" v-model="active" :panel="panel" />
    `,
  }),
} satisfies Meta<typeof VirtualTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Line: Story = {};

export const Pill: Story = { args: { variant: 'pill' } };

export const Closable: Story = { args: { closable: true } };
