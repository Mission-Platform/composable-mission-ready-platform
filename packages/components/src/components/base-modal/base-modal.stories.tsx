import { ref } from 'vue';
import { useRouter } from 'vue-router';

import BaseButton from '../base-button/base-button.vue';

import BaseModal from './base-modal.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Overlays/Modal',
  component: BaseModal,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `\`Modal\` component. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.`,
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg', 'xl', 'full'] },
    closeOnBackdrop: { control: 'boolean' },
    closeOnEsc: { control: 'boolean' },
  },
  args: {
    open: false,
    title: 'Modal Title',
    size: 'md',
    closeOnBackdrop: true,
    closeOnEsc: true,
  },
} satisfies Meta<typeof BaseModal>;

export default meta;
type Story = StoryObj<typeof meta>;

const defaultTemplate = `
  <div>
    <BaseButton @click="open = true">Open Modal</BaseButton>
    <BaseModal v-model:open="open" title="Confirm Action">
      <p>Are you sure you want to perform this action?</p>
      <template #footer>
        <BaseButton variant="secondary" @click="open = false">Cancel</BaseButton>
        <BaseButton @click="open = false">Confirm</BaseButton>
      </template>
    </BaseModal>
  </div>
`;

export const Default: Story = {
  parameters: { viewport: { defaultViewport: 'md' } },
  render: () => ({
    components: { BaseModal, BaseButton },
    setup() {
      const open = ref(false);
      return { open };
    },
    template: defaultTemplate,
  }),
};

export const Mobile: Story = {
  name: 'Mobile — bottom sheet (2xs)',
  parameters: { viewport: { defaultViewport: '2xs' } },
  render: () => ({
    components: { BaseModal, BaseButton },
    setup() {
      const open = ref(false);
      return { open };
    },
    template: defaultTemplate,
  }),
};

export const Tablet: Story = {
  name: 'Tablet (sm)',
  parameters: { viewport: { defaultViewport: 'sm' } },
  render: () => ({
    components: { BaseModal, BaseButton },
    setup() {
      const open = ref(false);
      return { open };
    },
    template: defaultTemplate,
  }),
};

export const Large: Story = {
  parameters: { viewport: { defaultViewport: 'md' } },
  render: () => ({
    components: { BaseModal, BaseButton },
    setup() {
      const open = ref(false);
      return { open };
    },
    template: `
      <div>
        <BaseButton @click="open = true">Open Large Modal</BaseButton>
        <BaseModal v-model:open="open" title="Large Content" size="lg">
          <p>This is a larger modal with more content space.</p>
          <p>You can put any content here.</p>
        </BaseModal>
      </div>
    `,
  }),
};

export const CloseOnRouteChange: Story = {
  name: 'Close on Route Change',
  parameters: { viewport: { defaultViewport: 'md' } },
  render: () => ({
    components: { BaseModal, BaseButton },
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
        <BaseModal v-model:open="open" title="Auto-closes on navigation" close-on-route-change>
          <p>This modal will close automatically when the route changes.</p>
        </BaseModal>
      </div>
    `,
  }),
};
