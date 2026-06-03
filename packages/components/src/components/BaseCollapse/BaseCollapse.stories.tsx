import type { Meta, StoryObj } from '@storybook/vue3-vite'

import BaseCollapse from './BaseCollapse.vue'

const meta = {
  title: 'Components/Display/Collapse',
  component: BaseCollapse,
  tags: ['autodocs'],
  argTypes: {
    open: { control: 'boolean' },
    disabled: { control: 'boolean' },
    summary: { control: 'text' },
  },
  args: {
    summary: 'Click to expand',
    open: false,
    disabled: false,
  },
  render: (args) => ({
    components: { BaseCollapse },
    setup() { return { args } },
    template: '<BaseCollapse v-bind="args">Hidden content goes here.</BaseCollapse>',
  }),
} satisfies Meta<typeof BaseCollapse>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const OpenByDefault: Story = { args: { open: true } }

export const Disabled: Story = { args: { disabled: true } }

export const CustomSummarySlot: Story = {
  render: () => ({
    components: { BaseCollapse },
    template: `
      <BaseCollapse>
        <template #summary>
          <span style="color: var(--mp-color-primary-default); font-weight: 600;">Custom summary slot</span>
        </template>
        Content inside the collapse panel.
      </BaseCollapse>
    `,
  }),
}
