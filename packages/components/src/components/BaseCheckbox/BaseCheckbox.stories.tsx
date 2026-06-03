import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, within } from 'storybook/test'

import BaseCheckbox from './BaseCheckbox.vue'

const meta = {
  title: 'Components/Forms/BaseCheckbox',
  component: BaseCheckbox,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    indeterminate: { control: 'boolean' },
    modelValue: { control: 'boolean' },
  },
  args: {
    modelValue: false,
    label: 'Accept terms and conditions',
    disabled: false,
    required: false,
    indeterminate: false,
    id: 'example-checkbox',
  },
  render: (args) => ({
    components: { BaseCheckbox },
    setup() {
      return { args }
    },
    template: '<BaseCheckbox v-bind="args" />',
  }),
} satisfies Meta<typeof BaseCheckbox>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    // Arrange
    const canvas = within(canvasElement)
    const checkbox = canvas.getByRole('checkbox', { name: /accept terms/i })

    // Act — check the checkbox
    await userEvent.click(checkbox)

    // Assert
    expect(checkbox).toBeChecked()
  },
}

export const Checked: Story = { args: { modelValue: true } }

export const Indeterminate: Story = { args: { indeterminate: true } }

export const WithHint: Story = { args: { hint: 'You must accept to continue.' } }

export const WithError: Story = { args: { error: 'You must accept the terms.' } }

export const Required: Story = { args: { required: true } }

export const Disabled: Story = { args: { disabled: true } }

export const DisabledChecked: Story = { args: { disabled: true, modelValue: true } }
