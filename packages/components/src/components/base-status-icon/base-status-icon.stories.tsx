import BaseStatusIcon from './base-status-icon.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Feedback/BaseStatusIcon',
  component: BaseStatusIcon,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`StatusIcon` component. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.',
      },
    },
  },
  argTypes: {
    status: { control: 'select', options: ['success', 'warning', 'error', 'info', 'neutral'] },
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
  },
  args: {
    status: 'success',
    size: 'md',
    label: 'Success',
  },
  render: (arguments_) => ({
    components: { BaseStatusIcon },
    setup() {
      return { args: arguments_ };
    },
    template: '<BaseStatusIcon v-bind="args" />',
  }),
} satisfies Meta<typeof BaseStatusIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {};

export const Warning: Story = { args: { status: 'warning', label: 'Warning' } };

export const Error: Story = { args: { status: 'error', label: 'Error' } };

export const Info: Story = { args: { status: 'info', label: 'Info' } };

export const Neutral: Story = { args: { status: 'neutral', label: 'Neutral' } };

export const AllStatuses: Story = {
  render: () => ({
    components: { BaseStatusIcon },
    template: `
      <div style="display: flex; align-items: center; gap: 16px;">
        <BaseStatusIcon status="success" label="Success" />
        <BaseStatusIcon status="warning" label="Warning" />
        <BaseStatusIcon status="error"   label="Error" />
        <BaseStatusIcon status="info"    label="Info" />
        <BaseStatusIcon status="neutral" label="Neutral" />
      </div>
    `,
  }),
};

export const Sizes: Story = {
  render: () => ({
    components: { BaseStatusIcon },
    template: `
      <div style="display: flex; align-items: center; gap: 16px;">
        <BaseStatusIcon status="success" size="sm" />
        <BaseStatusIcon status="success" size="md" />
        <BaseStatusIcon status="success" size="lg" />
      </div>
    `,
  }),
};
