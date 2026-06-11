import BaseSpinner from './base-spinner.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Feedback/Spinner',
  component: BaseSpinner,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`Spinner` component. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    variant: {
      control: 'select',
      options: [
        'primary',
        'secondary',
        'tertiary',
        'default',
        'success',
        'warning',
        'information',
        'error',
        'critical',
      ],
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
      <BaseSpinner variant="secondary" />
      <BaseSpinner variant="tertiary" />
      <BaseSpinner variant="default" />
      <BaseSpinner variant="success" />
      <BaseSpinner variant="warning" />
      <BaseSpinner variant="information" />
      <BaseSpinner variant="error" />
      <BaseSpinner variant="critical" />
    </div>
  ),
};
