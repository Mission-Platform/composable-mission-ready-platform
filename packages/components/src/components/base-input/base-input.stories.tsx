import { IconLock, IconSearch, IconUser } from '@mission-platform/icons';
import { expect, userEvent, within } from 'storybook/test';

import BaseInput from './base-input.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Forms/BaseInput',
  component: BaseInput,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`BaseInput` component. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.',
      },
    },
  },
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'search', 'tel', 'url'],
    },
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    disabled: { control: 'boolean' },
    required: { control: 'boolean' },
  },
  args: {
    modelValue: '',
    type: 'text',
    size: 'md',
    label: 'Label',
    placeholder: 'Enter text…',
    disabled: false,
    required: false,
    id: 'example-input',
  },
  render: (arguments_) => ({
    components: { BaseInput },
    setup() {
      return { args: arguments_ };
    },
    template: '<BaseInput v-bind="args" style="max-width: 360px" />',
  }),
} satisfies Meta<typeof BaseInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    // Arrange
    const canvas = within(canvasElement);
    const input = canvas.getByRole('textbox', { name: /label/i });

    // Act
    await userEvent.click(input);
    await userEvent.type(input, 'Hello world');

    // Assert
    expect(input).toHaveValue('Hello world');
  },
};

export const WithHint: Story = { args: { hint: 'This is a helpful hint.' } };

export const WithError: Story = { args: { error: 'This field is required.' } };

export const Required: Story = { args: { required: true } };

export const Disabled: Story = { args: { disabled: true } };

export const Small: Story = { args: { size: 'sm' } };

export const Large: Story = { args: { size: 'lg' } };

export const Password: Story = {
  args: { type: 'password', label: 'Password', placeholder: '••••••••' },
};

export const NoLabel: Story = { args: { label: undefined } };

export const WithPrefixIcon: Story = {
  render: () => ({
    components: { BaseInput, IconUser },
    template: `
      <BaseInput label="Username" placeholder="Enter username…" style="max-width: 360px">
        <template #prefix>
          <IconUser size="sm" style="margin-left: 10px; color: var(--mp-color-text-secondary);" />
        </template>
      </BaseInput>
    `,
  }),
};

export const WithSuffixIcon: Story = {
  render: () => ({
    components: { BaseInput, IconSearch },
    template: `
      <BaseInput label="Search" placeholder="Search…" style="max-width: 360px">
        <template #suffix>
          <IconSearch size="sm" style="margin-right: 10px; color: var(--mp-color-text-secondary);" />
        </template>
      </BaseInput>
    `,
  }),
};

export const PasswordWithIcon: Story = {
  render: () => ({
    components: { BaseInput, IconLock },
    template: `
      <BaseInput type="password" label="Password" placeholder="••••••••" style="max-width: 360px">
        <template #prefix>
          <IconLock size="sm" style="margin-left: 10px; color: var(--mp-color-text-secondary);" />
        </template>
      </BaseInput>
    `,
  }),
};
