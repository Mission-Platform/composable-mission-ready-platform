import type { Meta, StoryObj } from '@storybook/vue3-vite'
import IconEye from './Icon.vue'

const meta = {
  title: 'Icons/Visibility/IconEye',
  component: IconEye,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'number' },
    color: { control: 'color' },
    ariaLabel: { control: 'text' },
  },
  args: {
    size: 24,
    color: 'currentColor',
    ariaLabel: 'Show',
  },
} satisfies Meta<typeof IconEye>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Small: Story = { args: { size: 16 } }

export const Large: Story = { args: { size: 32 } }

export const Colored: Story = { args: { color: '#6c2fd4' } }
