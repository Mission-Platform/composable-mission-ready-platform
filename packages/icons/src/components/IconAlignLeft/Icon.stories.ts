import type { Meta, StoryObj } from '@storybook/vue3-vite'
import IconAlignLeft from './Icon.vue'

const meta = {
  title: 'Icons/Text Alignment/IconAlignLeft',
  component: IconAlignLeft,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'number' },
    color: { control: 'color' },
    ariaLabel: { control: 'text' },
  },
  args: {
    size: 24,
    color: 'currentColor',
    ariaLabel: 'Align left',
  },
} satisfies Meta<typeof IconAlignLeft>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Small: Story = { args: { size: 16 } }

export const Large: Story = { args: { size: 32 } }

export const Colored: Story = { args: { color: '#6c2fd4' } }
