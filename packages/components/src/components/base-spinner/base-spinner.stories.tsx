import BaseSpinner from './base-spinner.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Feedback/Spinner',
  component: BaseSpinner,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `\`Spinner\` component. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.`,
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
    variant: {
      control: 'select',
      options: ['primary', 'success', 'danger', 'warning', 'info', 'neutral'],
    },
  },
  args: {
    size: 'md',
    variant: 'primary',
  },
  render: (arguments_) => <BaseSpinner {...arguments_} />,
} satisfies Meta<typeof BaseSpinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <BaseSpinner size="xs" />
      <BaseSpinner size="sm" />
      <BaseSpinner size="md" />
      <BaseSpinner size="lg" />
      <BaseSpinner size="xl" />
    </div>
  ),
};

export const Variants: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <BaseSpinner variant="primary" />
      <BaseSpinner variant="success" />
      <BaseSpinner variant="danger" />
      <BaseSpinner variant="warning" />
      <BaseSpinner variant="info" />
      <BaseSpinner variant="neutral" />
    </div>
  ),
};
