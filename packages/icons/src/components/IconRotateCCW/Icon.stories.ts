import type { Meta, StoryObj } from '@storybook/vue3-vite'
import IconRotateCCW from './Icon.vue'

const meta = {
  title: 'Icons/Map/IconRotateCCW',
  component: IconRotateCCW,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'number' },
    color: { control: 'color' },
    ariaLabel: { control: 'text' },
  },
  args: {
    size: 24,
    color: 'currentColor',
    ariaLabel: 'Rotate Counter-Clockwise',
  },
} satisfies Meta<typeof IconRotateCCW>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Small: Story = { args: { size: 16 } }

export const Large: Story = { args: { size: 32 } }

export const Colored: Story = { args: { color: '#3b82f6' } }
