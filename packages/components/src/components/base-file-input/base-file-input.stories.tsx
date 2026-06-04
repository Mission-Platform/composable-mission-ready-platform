import BaseFileInput from './base-file-input.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Forms/BaseFileInput',
  component: BaseFileInput,
  tags: ['autodocs'],
  argTypes: {
    multiple: { control: 'boolean' },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
    dragDrop: { control: 'boolean' },
    accept: { control: 'text' },
  },
  args: {
    label: 'Upload file',
    multiple: false,
    disabled: false,
    required: false,
    dragDrop: false,
    hint: 'Accepted formats: PNG, JPG, PDF',
  },
  render: (arguments_) => ({
    components: { BaseFileInput },
    setup() {
      return { args: arguments_ };
    },
    template: '<BaseFileInput v-bind="args" style="max-width: 400px;" />',
  }),
} satisfies Meta<typeof BaseFileInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const DragDrop: Story = { args: { dragDrop: true } };

export const Multiple: Story = { args: { multiple: true, hint: 'Select multiple files' } };

export const WithError: Story = { args: { error: 'File is required', required: true } };

export const Disabled: Story = { args: { disabled: true } };

export const AcceptImages: Story = { args: { accept: 'image/*', hint: 'Images only' } };
