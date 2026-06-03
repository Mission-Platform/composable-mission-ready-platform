import { ref } from 'vue'
import type { Meta, StoryObj } from '@storybook/vue3-vite'

import BaseCalendar from './BaseCalendar.vue'

const meta = {
  title: 'Components/Forms/BaseCalendar',
  component: BaseCalendar,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
  },
  args: {
    size: 'md',
    modelValue: '',
    min: undefined,
    max: undefined,
    disabledDates: [],
    timezone: undefined,
  },
  render: (args) => ({
    components: { BaseCalendar },
    setup() {
      const date = ref(args.modelValue ?? '')
      return { args, date }
    },
    template: '<BaseCalendar v-bind="args" v-model="date" />',
  }),
} satisfies Meta<typeof BaseCalendar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithValue: Story = {
  args: { modelValue: '2025-06-15' },
}

export const Small: Story = { args: { size: 'sm' } }

export const Large: Story = { args: { size: 'lg' } }

export const WithMinMax: Story = {
  args: {
    modelValue: '2025-06-15',
    min: '2025-06-10',
    max: '2025-06-25',
  },
}

export const WithDisabledDates: Story = {
  args: {
    modelValue: '2025-06-01',
    disabledDates: ['2025-06-05', '2025-06-12', '2025-06-19'],
  },
}

export const WithTimezone: Story = {
  args: {
    modelValue: '2025-06-15',
    timezone: 'America/New_York',
  },
}

export const Showcase: Story = {
  render: () => ({
    components: { BaseCalendar },
    setup() {
      const date = ref('')
      return { date }
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: var(--mp-spacing-6); max-width: 360px;">
        <BaseCalendar v-model="date" />
        <p style="font-size: var(--mp-font-size-sm); color: var(--mp-color-text-secondary);">
          Selected: <strong>{{ date || '—' }}</strong>
        </p>
      </div>
    `,
  }),
}
