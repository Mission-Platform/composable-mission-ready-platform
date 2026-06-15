import { ref } from 'vue';
import { useRouter } from 'vue-router';

import BaseButton from '../base-button/base-button.vue';

import BaseDrawer from './base-drawer.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Layout/BaseDrawer',
  component: BaseDrawer,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`Drawer` component — a sliding panel anchored to a viewport edge via `placement` (`start`/`end` for full-height side panels sized by width, `top`/`bottom` for full-width panels sized by height). See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.',
      },
    },
  },
  argTypes: {
    placement: { control: 'select', options: ['start', 'end', 'top', 'bottom'] },
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    closeOnBackdrop: { control: 'boolean' },
    variant: { control: 'select', options: ['overlay', 'inline'] },
    inlineBreakpoint: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    draggable: { control: 'select', options: [false, true, '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
  },
  args: {
    open: false,
    placement: 'start',
    size: 'md',
    title: 'Drawer Title',
    closeOnBackdrop: true,
    variant: 'overlay',
    inlineBreakpoint: 'md',
    draggable: false,
  },
} satisfies Meta<typeof BaseDrawer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const StartDrawer: Story = {
  parameters: { viewport: { defaultViewport: 'md' } },
  render: () => ({
    components: { BaseDrawer, BaseButton },
    setup() {
      const open = ref(false);
      return { open };
    },
    template: `
      <div>
        <BaseButton @click="open = true">Open Start Drawer</BaseButton>
        <BaseDrawer v-model:open="open" placement="start" title="Navigation">
          <p>Drawer content goes here.</p>
        </BaseDrawer>
      </div>
    `,
  }),
};

export const EndDrawer: Story = {
  parameters: { viewport: { defaultViewport: 'md' } },
  render: () => ({
    components: { BaseDrawer, BaseButton },
    setup() {
      const open = ref(false);
      return { open };
    },
    template: `
      <div>
        <BaseButton @click="open = true">Open End Drawer</BaseButton>
        <BaseDrawer v-model:open="open" placement="end" title="Details">
          <p>Details panel content.</p>
          <template #footer>
            <BaseButton variant="secondary" @click="open = false">Close</BaseButton>
          </template>
        </BaseDrawer>
      </div>
    `,
  }),
};

export const TopDrawer: Story = {
  name: 'Top Drawer (sized by height)',
  parameters: { viewport: { defaultViewport: 'md' } },
  render: () => ({
    components: { BaseDrawer, BaseButton },
    setup() {
      const open = ref(false);
      return { open };
    },
    template: `
      <div>
        <BaseButton @click="open = true">Open Top Drawer</BaseButton>
        <BaseDrawer v-model:open="open" placement="top" size="2xs" title="Notifications">
          <p>A full-width panel that slides down from the top edge; its <code>size</code> sets the height.</p>
        </BaseDrawer>
      </div>
    `,
  }),
};

export const BottomDrawer: Story = {
  name: 'Bottom Drawer (sheet)',
  parameters: { viewport: { defaultViewport: 'md' } },
  render: () => ({
    components: { BaseDrawer, BaseButton },
    setup() {
      const open = ref(false);
      return { open };
    },
    template: `
      <div>
        <BaseButton @click="open = true">Open Bottom Drawer</BaseButton>
        <BaseDrawer v-model:open="open" placement="bottom" size="xs" title="Actions">
          <p>A bottom sheet that slides up from the bottom edge.</p>
          <template #footer>
            <BaseButton variant="secondary" @click="open = false">Close</BaseButton>
          </template>
        </BaseDrawer>
      </div>
    `,
  }),
};

export const StartDrawerMobile: Story = {
  name: 'Start Drawer — Mobile (2xs)',
  parameters: { viewport: { defaultViewport: '2xs' } },
  render: () => ({
    components: { BaseDrawer, BaseButton },
    setup() {
      const open = ref(false);
      return { open };
    },
    template: `
      <div>
        <BaseButton @click="open = true">Open Start Drawer</BaseButton>
        <BaseDrawer v-model:open="open" placement="start" title="Navigation">
          <p>On mobile a start/end drawer spans the full viewport width.</p>
        </BaseDrawer>
      </div>
    `,
  }),
};

export const InlineFixedOpen: Story = {
  name: 'Inline — Fixed Open (responsive)',
  parameters: { viewport: { defaultViewport: 'md' } },
  render: () => ({
    components: { BaseDrawer, BaseButton },
    setup() {
      // `open` only matters below the `inlineBreakpoint`, where the drawer
      // collapses back into a toggleable overlay.
      const open = ref(false);
      return { open };
    },
    template: `
      <div style="display: flex; min-height: 24rem; gap: 1rem; align-items: stretch;">
        <BaseDrawer
          v-model:open="open"
          variant="inline"
          inline-breakpoint="sm"
          placement="start"
          size="xs"
          title="Navigation"
        >
          <p>On screens ≥ <code>sm</code> this renders inline as a fixed-open panel.</p>
          <p>Below <code>sm</code> it becomes a toggleable overlay drawer.</p>
        </BaseDrawer>
        <main style="flex: 1; padding: 1rem;">
          <BaseButton @click="open = true">Open drawer (mobile only)</BaseButton>
          <p>Main content sits beside the inline drawer on larger screens.</p>
        </main>
      </div>
    `,
  }),
};

export const Resizable: Story = {
  name: 'Resizable (draggable, max size = lg)',
  parameters: { viewport: { defaultViewport: 'md' } },
  render: () => ({
    components: { BaseDrawer, BaseButton },
    setup() {
      const open = ref(false);
      const size = ref<number | undefined>(undefined);
      return { open, size };
    },
    template: `
      <div>
        <BaseButton @click="open = true">Open resizable drawer</BaseButton>
        <p v-if="size">Current size: {{ size.toFixed(2) }}rem</p>
        <BaseDrawer
          v-model:open="open"
          placement="start"
          size="sm"
          title="Drag my inner edge"
          draggable="lg"
          @resize="size = $event"
        >
          <p>Grab the strip on the inner edge and drag to resize.</p>
          <p>The size is clamped to the <code>lg</code> maximum.</p>
        </BaseDrawer>
      </div>
    `,
  }),
};

export const ResizableBottom: Story = {
  name: 'Resizable bottom sheet (drag the top edge)',
  parameters: { viewport: { defaultViewport: 'md' } },
  render: () => ({
    components: { BaseDrawer, BaseButton },
    setup() {
      const open = ref(false);
      const size = ref<number | undefined>(undefined);
      return { open, size };
    },
    template: `
      <div>
        <BaseButton @click="open = true">Open resizable bottom sheet</BaseButton>
        <p v-if="size">Current height: {{ size.toFixed(2) }}rem</p>
        <BaseDrawer
          v-model:open="open"
          placement="bottom"
          size="xs"
          title="Drag my top edge"
          :draggable="true"
          @resize="size = $event"
        >
          <p>Grab the strip on the top edge and drag up to grow the sheet's height.</p>
        </BaseDrawer>
      </div>
    `,
  }),
};

export const CloseOnRouteChange: Story = {
  name: 'Close on Route Change',
  parameters: { viewport: { defaultViewport: 'md' } },
  render: () => ({
    components: { BaseDrawer, BaseButton },
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
        <BaseDrawer v-model:open="open" title="Auto-closes on navigation" close-on-route-change>
          <p>This drawer will close automatically when the route changes.</p>
          <p>Navigate away to see it close.</p>
        </BaseDrawer>
      </div>
    `,
  }),
};

export const PersistOnRouteChange: Story = {
  name: 'Persist on Route Change (closeOnRouteChange=false)',
  parameters: { viewport: { defaultViewport: 'md' } },
  render: () => ({
    components: { BaseDrawer, BaseButton },
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
        <BaseDrawer v-model:open="open" title="Stays open on navigation" :close-on-route-change="false">
          <p>This drawer will stay open even when the route changes.</p>
        </BaseDrawer>
      </div>
    `,
  }),
};
