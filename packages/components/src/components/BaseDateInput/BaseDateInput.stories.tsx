import { ref } from 'vue'
import type { Meta, StoryObj } from '@storybook/vue3-vite'

import BaseDateInput from './BaseDateInput.vue'

const meta = {
  title: 'Components/Forms/BaseDateInput',
  component: BaseDateInput,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
  },
  args: {
    label: 'Date',
    size: 'md',
    disabled: false,
    required: false,
  },
  render: (args) => ({
    components: { BaseDateInput },
    setup() {
      const date = ref(args.modelValue ?? '')
      return { args, date }
    },
    template: '<BaseDateInput v-bind="args" v-model="date" />',
  }),
} satisfies Meta<typeof BaseDateInput>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithValue: Story = {
  args: { modelValue: '2025-06-15' },
}

export const Small: Story = { args: { size: 'sm' } }

export const Large: Story = { args: { size: 'lg' } }

export const Required: Story = { args: { required: true, hint: 'This field is required.' } }

export const WithError: Story = { args: { error: 'Please select a valid date.' } }

export const Disabled: Story = {
  args: { disabled: true, modelValue: '2025-06-15' },
  // WCAG 2.1 SC 1.4.3 explicitly exempts inactive (disabled) UI components from contrast requirements.
  parameters: { a11y: { config: { rules: [{ id: 'color-contrast', enabled: false }] } } },
}

export const MinMax: Story = {
  args: {
    min: '2025-01-01',
    max: '2025-12-31',
    hint: 'Only 2025 dates are selectable.',
  },
}

export const Showcase: Story = {
  render: () => ({
    components: { BaseDateInput },
    setup() {
      const date = ref('')
      return { date }
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: var(--mp-spacing-6); max-width: 520px;">
        <BaseDateInput v-model="date" label="Date" placeholder="YYYY-MM-DD" hint="Click to open the calendar." />
        <p style="font-size: var(--mp-font-size-sm); color: var(--mp-color-text-secondary);">Value: <strong>{{ date || '—' }}</strong></p>
      </div>
    `,
  }),
}
