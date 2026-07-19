import { h, ref } from 'vue';

import { Tabs } from '@mission-platform/components/vue';

import type { TabItem } from './base-tabs';
import type { Meta, StoryObj } from '@storybook/vue3-vite';

const tabs: TabItem[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'details', label: 'Details' },
  { id: 'activity', label: 'Activity' },
  { id: 'settings', label: 'Settings', disabled: true },
];

/**
 * `Tabs` is the Vue 3 build of the write-once `BaseTabs` in this package. The
 * component is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/jsx`) and compiled straight to a Vue component at build
 * time by `@mission-platform/vite-plugin-jsx`. The very same source also ships
 * as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Navigation/BaseTabs',
  component: Tabs,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Tabs` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). It renders an ARIA `tablist` with roving `tabindex` + Arrow/Home/End keyboard navigation and optional closable/addable affordances. Like the Vue SFC it renders a `tabpanel` for **every** tab, keeping inactive panels mounted but `hidden` (so panel state survives switches). The original `BaseTabList`/`BaseTab`/`BaseTabPanel` sub-components are inlined, the icons become `+`/`✕` glyphs, and since the neutral dialect cannot express Vue’s dynamic per-id slot names each panel invokes one scoped `panel` **render-prop** with `{ tab }` (passed as the `:panel` prop, not a Vue slot); `v-model` + emits become `onUpdateModelValue`/`onChange`/`onClose`/`onAdd`/`onRename`. Styling comes from the co-located `base-tabs.module.scss`.',
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
    components: { Tabs },
    setup() {
      const active = ref(arguments_.modelValue ?? 'overview');
      // `panel` is a render-prop (not a Vue slot): it receives `{ tab }` and
      // returns the active panel's content as VNodes.
      const panel = ({ tab }: { tab: TabItem }) =>
        h('p', { style: 'margin: 0;' }, ['Content for the ', h('strong', tab.label), ' tab.']);
      return { args: arguments_, active, panel };
    },
    template: `
      <Tabs v-bind="args" :model-value="active" :panel="panel" @update-model-value="active = $event" />
    `,
  }),
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Line: Story = {};

export const Pill: Story = { args: { variant: 'pill' } };

export const Closable: Story = { args: { closable: true } };

export const Addable: Story = { args: { addable: true } };

export const ClosableAndAddable: Story = { args: { closable: true, addable: true } };
