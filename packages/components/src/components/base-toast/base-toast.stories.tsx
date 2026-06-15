import { useToast } from '../../composables/use-toast';
import BaseButton from '../base-button/base-button.vue';


import BaseToastContainer from './base-toast-container.vue';
import BaseToast from './base-toast.vue';

import type { ToastPosition } from '../../composables/use-toast';
import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Feedback/BaseToast',
  component: BaseToast,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`Toast` notifications — show transient messages via the `useToast` store and render them with `BaseToastContainer`. `BaseToast` is the presentational item. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.',
      },
    },
  },
  argTypes: {
    variant: { control: 'select', options: ['info', 'success', 'warning', 'error', 'neutral'] },
    title: { control: 'text' },
    message: { control: 'text' },
    dismissible: { control: 'boolean' },
  },
  args: {
    variant: 'info',
    title: 'Notification',
    message: 'This is a single toast item.',
    dismissible: true,
  },
  render: (arguments_) => ({
    components: { BaseToast },
    setup() {
      return { args: arguments_ };
    },
    template: `<BaseToast v-bind="args" />`,
  }),
} satisfies Meta<typeof BaseToast>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {};

export const Success: Story = { args: { variant: 'success', title: 'Saved' } };

export const Error: Story = { args: { variant: 'error', title: 'Upload failed' } };

export const LiveStore: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Trigger live toasts through the `useToast` store, rendered by `BaseToastContainer`.',
      },
    },
  },
  render: () => ({
    components: { BaseButton, BaseToastContainer },
    setup() {
      const toast = useToast();
      const position: ToastPosition = 'top-right';
      return { toast, position };
    },
    template: `
      <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
        <BaseButton variant="secondary" @click="toast.info('Heads up — something happened.')">Info</BaseButton>
        <BaseButton variant="secondary" @click="toast.success('Your changes were saved.')">Success</BaseButton>
        <BaseButton variant="secondary" @click="toast.warning('Your session is about to expire.')">Warning</BaseButton>
        <BaseButton variant="secondary" @click="toast.error('Something went wrong.')">Error</BaseButton>
        <BaseButton variant="ghost" @click="toast.clear()">Clear all</BaseButton>
        <BaseToastContainer :position="position" />
      </div>
    `,
  }),
};
