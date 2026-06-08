import BaseMarkdownInput from './base-markdown-input.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Forms/BaseMarkdownInput',
  component: BaseMarkdownInput,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `\`BaseMarkdownInput\` component. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.`,
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
    readonly: { control: 'boolean' },
    required: { control: 'boolean' },
    rows: { control: 'number' },
  },
  args: {
    modelValue: '',
    size: 'md',
    label: 'Description',
    placeholder: 'Write something in **markdown**…',
    rows: 6,
    disabled: false,
    readonly: false,
    required: false,
    id: 'example-markdown-input',
  },
  render: (arguments_) => ({
    components: { BaseMarkdownInput },
    setup() {
      return { args: arguments_ };
    },
    template: '<BaseMarkdownInput v-bind="args" style="max-width: 600px" />',
  }),
} satisfies Meta<typeof BaseMarkdownInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithContent: Story = {
  args: {
    modelValue: '# Hello\n\nThis is **bold** and _italic_ text.\n\n- Item one\n- Item two\n',
  },
};

export const WithHint: Story = { args: { hint: 'Markdown formatting is supported.' } };

export const WithError: Story = { args: { error: 'This field is required.' } };

export const Required: Story = { args: { required: true } };

export const Disabled: Story = {
  args: { disabled: true, modelValue: '# Disabled\n\nThis content is **not editable**.' },
};

export const Readonly: Story = {
  args: {
    readonly: true,
    modelValue: '# Readonly\n\nThis content is displayed in preview mode and **cannot be edited**.',
  },
};

export const Small: Story = { args: { size: 'sm' } };

export const Large: Story = { args: { size: 'lg' } };
