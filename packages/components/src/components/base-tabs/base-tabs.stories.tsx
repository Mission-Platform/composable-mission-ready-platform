import { ref } from 'vue';

import BaseTabs from './base-tabs.vue';

import type { TabItem } from './base-tabs.vue';
import type { Meta, StoryObj } from '@storybook/vue3-vite';

const tabs: TabItem[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'details', label: 'Details' },
  { id: 'settings', label: 'Settings' },
  { id: 'disabled', label: 'Disabled', disabled: true },
];

const meta = {
  title: 'Components/Navigation/Tabs',
  component: BaseTabs,
  tags: ['autodocs'],
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
} satisfies Meta<typeof BaseTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Line: Story = {
  render: (arguments_) => ({
    components: { BaseTabs },
    setup() {
      return { args: arguments_, tabs };
    },
    template: `
      <BaseTabs v-bind="args" style="max-width: 480px;">
        <template #overview>
          <p>Overview content here.</p>
        </template>
        <template #details>
          <p>Details content here.</p>
        </template>
        <template #settings>
          <p>Settings content here.</p>
        </template>
      </BaseTabs>
    `,
  }),
};

export const Pill: Story = {
  render: () => ({
    components: { BaseTabs },
    setup() {
      return { tabs };
    },
    template: `
      <BaseTabs :tabs="tabs" variant="pill" style="max-width: 480px;">
        <template #overview><p>Overview</p></template>
        <template #details><p>Details</p></template>
        <template #settings><p>Settings</p></template>
      </BaseTabs>
    `,
  }),
};

export const ClosableAndAddable: Story = {
  name: 'Closable + Addable (dynamic)',
  render: () => ({
    components: { BaseTabs },
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
      <BaseTabs
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
          <p style="padding: 12px;">Content for {{ tab.label }}</p>
        </template>
      </BaseTabs>
    `,
  }),
};

export const ManyTabsScrollable: Story = {
  name: 'Many Tabs (scrollable)',
  render: () => ({
    components: { BaseTabs },
    setup() {
      const manyTabs: TabItem[] = Array.from({ length: 12 }, (_, index) => ({
        id: `tab-${index + 1}`,
        label: `Tab ${index + 1}`,
      }));
      const activeId = ref(manyTabs[0].id);
      return { manyTabs, activeId };
    },
    template: `
      <BaseTabs
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
      </BaseTabs>
    `,
  }),
};
