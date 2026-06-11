import BaseTextarea from './base-textarea.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Forms/BaseTextarea',
  component: BaseTextarea,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`BaseTextarea` component. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    resize: { control: 'select', options: ['none', 'vertical', 'horizontal', 'both'] },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    rows: { control: 'number' },
  },
  args: {
    modelValue: '',
    size: 'md',
    label: 'Message',
    placeholder: 'Enter your message…',
    rows: 4,
    resize: 'vertical',
    disabled: false,
    required: false,
    id: 'example-textarea',
  },
  render: (arguments_) => ({
    components: { BaseTextarea },
    setup() {
      return { args: arguments_ };
    },
    template: '<BaseTextarea v-bind="args" style="max-width: 400px" />',
  }),
} satisfies Meta<typeof BaseTextarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithHint: Story = { args: { hint: 'Max 500 characters.' } };

export const WithError: Story = { args: { error: 'This field is required.' } };

export const Required: Story = { args: { required: true } };

export const Disabled: Story = { args: { disabled: true } };

export const Small: Story = { args: { size: 'sm' } };

export const Large: Story = { args: { size: 'lg' } };

export const NoResize: Story = { args: { resize: 'none' } };

export const TallRows: Story = { args: { rows: 8 } };
