import { ref } from 'vue';

import BaseVirtualTabs from './base-virtual-tabs.vue';

import type { TabItem } from '../base-tabs';
import type { Meta, StoryObj } from '@storybook/vue3-vite';

const tabs: TabItem[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'details', label: 'Details' },
  { id: 'settings', label: 'Settings' },
  { id: 'disabled', label: 'Disabled', disabled: true },
];

const meta = {
  title: 'Components/Navigation/VirtualTabs',
  component: BaseVirtualTabs,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: "`VirtualTabs` component. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.",
      },
    },
  },
  argTypes: {
    variant: { control: 'select', options: ['line', 'pill'] },
    closable: { control: 'boolean' },
    addable: { control: 'boolean' },
  },
  args: {
    tabs,
    modelValue: 'overview',
    variant: 'line',
    closable: false,
    addable: false,
  },
} satisfies Meta<typeof BaseVirtualTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Line: Story = {
  render: (arguments_) => ({
    components: { BaseVirtualTabs },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <BaseVirtualTabs v-bind="args" style="max-width: 480px;">
        <template #overview>
          <p>Overview content — only this panel is mounted.</p>
        </template>
        <template #details>
          <p>Details content — only this panel is mounted.</p>
        </template>
        <template #settings>
          <p>Settings content — only this panel is mounted.</p>
        </template>
      </BaseVirtualTabs>
    `,
  }),
};

export const Pill: Story = {
  render: () => ({
    components: { BaseVirtualTabs },
    setup() {
      return { tabs };
    },
    template: `
      <BaseVirtualTabs :tabs="tabs" variant="pill" style="max-width: 480px;">
        <template #overview><p>Overview</p></template>
        <template #details><p>Details</p></template>
        <template #settings><p>Settings</p></template>
      </BaseVirtualTabs>
    `,
  }),
};

export const ClosableAndAddable: Story = {
  name: 'Closable + Addable (dynamic)',
  render: () => ({
    components: { BaseVirtualTabs },
    setup() {
      let counter = tabs.length;
      const dynamicTabs = ref<TabItem[]>([...tabs.filter((t) => !t.disabled)]);
      const activeId = ref(dynamicTabs.value[0].id);

      function onAdd() {
        counter++;
        const id = `tab-${counter}`;
        dynamicTabs.value = [...dynamicTabs.value, { id, label: `Tab ${counter}` }];
        activeId.value = id;
      }

      function onClose(id: string) {
        const index = dynamicTabs.value.findIndex((t) => t.id === id);
        dynamicTabs.value = dynamicTabs.value.filter((t) => t.id !== id);
        if (activeId.value === id && dynamicTabs.value.length > 0) {
          activeId.value = dynamicTabs.value[Math.max(0, index - 1)].id;
        }
      }

      return { dynamicTabs, activeId, onAdd, onClose };
    },
    template: `
      <BaseVirtualTabs
        :tabs="dynamicTabs"
        :model-value="activeId"
        closable
        addable
        style="max-width: 600px;"
        @update:model-value="activeId = $event"
        @add="onAdd"
        @close="onClose"
      >
        <template v-for="tab in dynamicTabs" #[tab.id] :key="tab.id">
          <p style="padding: 12px;">Content for {{ tab.label }} — only this panel is in the DOM.</p>
        </template>
      </BaseVirtualTabs>
    `,
  }),
};

export const ManyTabsScrollable: Story = {
  name: 'Many Tabs (scrollable)',
  render: () => ({
    components: { BaseVirtualTabs },
    setup() {
      const manyTabs: TabItem[] = Array.from({ length: 12 }, (_, index) => ({
        id: `tab-${index + 1}`,
        label: `Tab ${index + 1}`,
      }));
      const activeId = ref(manyTabs[0].id);
      return { manyTabs, activeId };
    },
    template: `
      <BaseVirtualTabs
        :tabs="manyTabs"
        :model-value="activeId"
        closable
        addable
        style="max-width: 480px;"
        @update:model-value="activeId = $event"
      >
        <template v-for="tab in manyTabs" #[tab.id] :key="tab.id">
          <p style="padding: 12px;">Content for {{ tab.label }}</p>
        </template>
      </BaseVirtualTabs>
    `,
  }),
};
