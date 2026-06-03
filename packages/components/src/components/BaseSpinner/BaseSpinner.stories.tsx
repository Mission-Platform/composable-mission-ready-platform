import type { Meta, StoryObj } from '@storybook/vue3-vite'

import BaseSpinner from './BaseSpinner.vue'

const meta = {
  title: 'Components/Feedback/Spinner',
  component: BaseSpinner,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
    variant: { control: 'select', options: ['primary', 'success', 'danger', 'warning', 'info', 'neutral'] },
  },
  args: {
    size: 'md',
    variant: 'primary',
  },
  render: (args) => ({
    components: { BaseSpinner },
    setup() { return { args } },
    template: '<BaseSpinner v-bind="args" />',
  }),
} satisfies Meta<typeof BaseSpinner>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Sizes: Story = {
  render: () => ({
    components: { BaseSpinner },
    template: `
      <div style="display: flex; align-items: center; gap: 16px;">
        <BaseSpinner size="xs" />
        <BaseSpinner size="sm" />
        <BaseSpinner size="md" />
        <BaseSpinner size="lg" />
        <BaseSpinner size="xl" />
      </div>
    `,
  }),
}

export const Variants: Story = {
  render: () => ({
    components: { BaseSpinner },
    template: `
      <div style="display: flex; align-items: center; gap: 16px;">
        <BaseSpinner variant="primary" />
        <BaseSpinner variant="success" />
        <BaseSpinner variant="danger" />
        <BaseSpinner variant="warning" />
        <BaseSpinner variant="info" />
        <BaseSpinner variant="neutral" />
      </div>
    `,
  }),
}
