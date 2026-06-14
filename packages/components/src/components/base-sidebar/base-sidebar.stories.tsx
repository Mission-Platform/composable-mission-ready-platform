import { ref } from 'vue';
import { useRouter } from 'vue-router';

import BaseButton from '../base-button/base-button.vue';

import BaseSidebar from './base-sidebar.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Layout/Sidebar',
  component: BaseSidebar,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`Sidebar` component. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.',
      },
    },
  },
  argTypes: {
    side: { control: 'select', options: ['left', 'right'] },
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    closeOnBackdrop: { control: 'boolean' },
    variant: { control: 'select', options: ['overlay', 'inline'] },
    inlineBreakpoint: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    draggable: { control: 'select', options: [false, true, '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
  },
  args: {
    open: false,
    side: 'left',
    size: 'md',
    title: 'Sidebar Title',
    closeOnBackdrop: true,
    variant: 'overlay',
    inlineBreakpoint: 'md',
    draggable: false,
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

export const InlineFixedOpen: Story = {
  name: 'Inline — Fixed Open (responsive)',
  parameters: { viewport: { defaultViewport: 'md' } },
  render: () => ({
    components: { BaseSidebar, BaseButton },
    setup() {
      // `open` only matters below the `inlineBreakpoint`, where the sidebar
      // collapses back into a toggleable overlay drawer.
      const open = ref(false);
      return { open };
    },
    template: `
      <div style="display: flex; min-height: 24rem; gap: 1rem; align-items: stretch;">
        <BaseSidebar
          v-model:open="open"
          variant="inline"
          inline-breakpoint="sm"
          side="left"
          size="xs"
          title="Navigation"
        >
          <p>On screens ≥ <code>sm</code> this renders inline as a fixed-open column.</p>
          <p>Below <code>sm</code> it becomes a toggleable overlay drawer.</p>
        </BaseSidebar>
        <main style="flex: 1; padding: 1rem;">
          <BaseButton @click="open = true">Open sidebar (mobile only)</BaseButton>
          <p>Main content sits beside the inline sidebar on larger screens.</p>
        </main>
      </div>
    `,
  }),
};

export const Resizable: Story = {
  name: 'Resizable (draggable, max width = lg)',
  parameters: { viewport: { defaultViewport: 'md' } },
  render: () => ({
    components: { BaseSidebar, BaseButton },
    setup() {
      const open = ref(false);
      const width = ref<number | undefined>();
      return { open, width };
    },
    template: `
      <div>
        <BaseButton @click="open = true">Open resizable sidebar</BaseButton>
        <p v-if="width">Current width: {{ width.toFixed(2) }}rem</p>
        <BaseSidebar
          v-model:open="open"
          side="left"
          size="sm"
          title="Drag my inner edge"
          draggable="lg"
          @resize="width = $event"
        >
          <p>Grab the strip on the right edge and drag to resize.</p>
          <p>The width is clamped to the <code>lg</code> size (max width).</p>
        </BaseSidebar>
      </div>
    `,
  }),
};

export const ResizableToFullScreen: Story = {
  name: 'Resizable to full screen (draggable=true)',
  parameters: { viewport: { defaultViewport: 'md' } },
  render: () => ({
    components: { BaseSidebar, BaseButton },
    setup() {
      const open = ref(false);
      return { open };
    },
    template: `
      <div>
        <BaseButton @click="open = true">Open sidebar</BaseButton>
        <BaseSidebar v-model:open="open" side="left" size="sm" title="Drag to full screen" :draggable="true">
          <p>With <code>draggable="true"</code> the sidebar can be resized up to the full viewport width.</p>
        </BaseSidebar>
      </div>
    `,
  }),
};

export const ResizableCustomMaxWidth: Story = {
  name: 'Resizable to a custom max width (rem)',
  parameters: { viewport: { defaultViewport: 'md' } },
  render: () => ({
    components: { BaseSidebar, BaseButton },
    setup() {
      const open = ref(false);
      return { open };
    },
    template: `
      <div>
        <BaseButton @click="open = true">Open sidebar</BaseButton>
        <BaseSidebar v-model:open="open" side="left" size="sm" title="Max 48rem" :draggable="48">
          <p>A numeric <code>draggable</code> is treated as a custom maximum width in <code>rem</code> (here <code>48rem</code>).</p>
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
