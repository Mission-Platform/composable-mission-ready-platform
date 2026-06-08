import { ref } from 'vue';
import { useRouter } from 'vue-router';

import BaseButton from '../base-button/base-button.vue';

import BaseDialog from './base-dialog.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Overlays/Dialog',
  component: BaseDialog,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: "`Dialog` component. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.",
      },
    },
  },
  argTypes: {
    open: { control: 'boolean' },
    closeOnBackdrop: { control: 'boolean' },
    title: { control: 'text' },
  },
  args: {
    open: false,
    title: 'Dialog Title',
    closeOnBackdrop: true,
  },
} satisfies Meta<typeof BaseDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { BaseDialog, BaseButton },
    setup() {
      const open = ref(false);
      return { open };
    },
    template: `
      <div>
        <BaseButton @click="open = true">Open Dialog</BaseButton>
        <BaseDialog v-model:open="open" title="Confirm Action">
          Are you sure you want to proceed?
          <template #footer>
            <BaseButton variant="secondary" @click="open = false">Cancel</BaseButton>
            <BaseButton @click="open = false">Confirm</BaseButton>
          </template>
        </BaseDialog>
      </div>
    `,
  }),
};

export const NoHeader: Story = {
  render: () => ({
    components: { BaseDialog, BaseButton },
    setup() {
      const open = ref(false);
      return { open };
    },
    template: `
      <div>
        <BaseButton @click="open = true">Open (no header)</BaseButton>
        <BaseDialog v-model:open="open" :closeOnBackdrop="true">
          This dialog has no title or header slot.
        </BaseDialog>
      </div>
    `,
  }),
};

export const CloseOnRouteChange: Story = {
  name: 'Close on Route Change',
  render: () => ({
    components: { BaseDialog, BaseButton },
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
        <BaseDialog v-model:open="open" title="Auto-closes on navigation" close-on-route-change>
          <p>This dialog will close automatically when the route changes.</p>
          <template #footer>
            <BaseButton variant="secondary" @click="open = false">Close</BaseButton>
          </template>
        </BaseDialog>
      </div>
    `,
  }),
};
