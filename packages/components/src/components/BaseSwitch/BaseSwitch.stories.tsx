import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, within } from 'storybook/test'

import BaseSwitch from './BaseSwitch.vue'

const meta = {
  title: 'Components/Forms/BaseSwitch',
  component: BaseSwitch,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
    modelValue: { control: 'boolean' },
  },
  args: {
    modelValue: false,
    size: 'md',
    label: 'Enable notifications',
    disabled: false,
    id: 'example-switch',
  },
  render: (args) => ({
    components: { BaseSwitch },
    setup() {
      return { args }
    },
    template: '<BaseSwitch v-bind="args" />',
  }),
} satisfies Meta<typeof BaseSwitch>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvasElement }) => {
    // Arrange
    const canvas = within(canvasElement)
    const switchEl = canvas.getByRole('switch', { name: /enable notifications/i })

    // Act — toggle on
    await userEvent.click(switchEl)

    // Assert
    expect(switchEl).toBeChecked()
  },
}

export const On: Story = { args: { modelValue: true } }

export const WithHint: Story = { args: { hint: 'You will receive email notifications.' } }

export const WithError: Story = { args: { error: 'This setting is required.' } }

export const Disabled: Story = { args: { disabled: true } }

export const DisabledOn: Story = { args: { disabled: true, modelValue: true } }

export const Small: Story = { args: { size: 'sm' } }

export const Large: Story = { args: { size: 'lg' } }

export const NoLabel: Story = { args: { label: undefined, ariaLabel: 'Enable notifications' } }
