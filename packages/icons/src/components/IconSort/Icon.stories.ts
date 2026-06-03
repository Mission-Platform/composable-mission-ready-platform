import type { Meta, StoryObj } from '@storybook/vue3-vite'
import IconSort from './Icon.vue'

const meta = {
  title: 'Icons/Navigation / Controls/IconSort',
  component: IconSort,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    color: { control: 'color' },
    direction: { control: 'select', options: ['asc', 'desc', null] },
    active: { control: 'boolean' },
    ariaLabel: { control: 'text' },
  },
  args: { size: 'md', color: 'currentColor', active: false, direction: null },
} satisfies Meta<typeof IconSort>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const ActiveAsc: Story = { args: { active: true, direction: 'asc' } }
export const ActiveDesc: Story = { args: { active: true, direction: 'desc' } }
export const Inactive: Story = { args: { active: false, direction: null } }
export const Small: Story = { args: { size: 'sm' } }
export const Large: Story = { args: { size: 'xl' } }
