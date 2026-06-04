import { ref } from 'vue';
import { useRouter } from 'vue-router';

import BaseButton from '../base-button/base-button.vue';

import BaseSidebar from './base-sidebar.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Layout/Sidebar',
  component: BaseSidebar,
  tags: ['autodocs'],
  argTypes: {
    side: { control: 'select', options: ['left', 'right'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    closeOnBackdrop: { control: 'boolean' },
  },
  args: {
    open: false,
    side: 'left',
    size: 'md',
    title: 'Sidebar Title',
    closeOnBackdrop: true,
  },
} satisfies Meta<typeof BaseSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LeftSidebar: Story = {
  parameters: { viewport: { defaultViewport: 'md' } },
  render: () => ({
    components: { BaseSidebar, BaseButton },
    setup() {
      const open = ref(false);
      return { open };
    },
    template: `
      <div>
        <BaseButton @click="open = true">Open Left Sidebar</BaseButton>
        <BaseSidebar v-model:open="open" side="left" title="Navigation">
          <p>Sidebar content goes here.</p>
        </BaseSidebar>
      </div>
    `,
  }),
};

export const LeftSidebarMobile: Story = {
  name: 'Left Sidebar — Mobile (2xs)',
  parameters: { viewport: { defaultViewport: '2xs' } },
  render: () => ({
    components: { BaseSidebar, BaseButton },
    setup() {
      const open = ref(false);
      return { open };
    },
    template: `
      <div>
        <BaseButton @click="open = true">Open Left Sidebar</BaseButton>
        <BaseSidebar v-model:open="open" side="left" title="Navigation">
          <p>On mobile the sidebar spans the full viewport width.</p>
        </BaseSidebar>
      </div>
    `,
  }),
};

export const LeftSidebarTablet: Story = {
  name: 'Left Sidebar — Tablet (sm)',
  parameters: { viewport: { defaultViewport: 'sm' } },
  render: () => ({
    components: { BaseSidebar, BaseButton },
    setup() {
      const open = ref(false);
      return { open };
    },
    template: `
      <div>
        <BaseButton @click="open = true">Open Left Sidebar</BaseButton>
        <BaseSidebar v-model:open="open" side="left" title="Navigation">
          <p>On tablet the sidebar shows at its fixed width.</p>
        </BaseSidebar>
      </div>
    `,
  }),
};

export const RightSidebar: Story = {
  parameters: { viewport: { defaultViewport: 'md' } },
  render: () => ({
    components: { BaseSidebar, BaseButton },
    setup() {
      const open = ref(false);
      return { open };
    },
    template: `
      <div>
        <BaseButton @click="open = true">Open Right Sidebar</BaseButton>
        <BaseSidebar v-model:open="open" side="right" title="Details">
          <p>Details panel content.</p>
          <template #footer>
            <BaseButton variant="secondary" @click="open = false">Close</BaseButton>
          </template>
        </BaseSidebar>
      </div>
    `,
  }),
};

export const CloseOnRouteChange: Story = {
  name: 'Close on Route Change',
  parameters: { viewport: { defaultViewport: 'md' } },
  render: () => ({
    components: { BaseSidebar, BaseButton },
    setup() {
      const open = ref(false);
      const router = useRouter();
      function navigate() {
        open.value = true;
        setTimeout(() => router.push('/reports'), 1500);
      }
      return { open, navigate };
    },
    template: `
      <div>
        <BaseButton @click="navigate">Open &amp; navigate after 1.5s</BaseButton>
        <BaseSidebar v-model:open="open" title="Auto-closes on navigation" close-on-route-change>
          <p>This sidebar will close automatically when the route changes.</p>
          <p>Navigate away to see it close.</p>
        </BaseSidebar>
      </div>
    `,
  }),
};

export const PersistOnRouteChange: Story = {
  name: 'Persist on Route Change (closeOnRouteChange=false)',
  parameters: { viewport: { defaultViewport: 'md' } },
  render: () => ({
    components: { BaseSidebar, BaseButton },
    setup() {
      const open = ref(false);
      const router = useRouter();
      function navigate() {
        open.value = true;
        setTimeout(() => router.push('/reports'), 1500);
      }
      return { open, navigate };
    },
    template: `
      <div>
        <BaseButton @click="navigate">Open &amp; navigate after 1.5s</BaseButton>
        <BaseSidebar v-model:open="open" title="Stays open on navigation" :close-on-route-change="false">
          <p>This sidebar will stay open even when the route changes.</p>
        </BaseSidebar>
      </div>
    `,
  }),
};
