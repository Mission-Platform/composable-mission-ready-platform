import { IconDownload, IconPlus, IconTrash } from '@mission-platform/icons';
import { expect, fn, userEvent, within } from 'storybook/test';

import BaseButton from './BaseButton.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Display/Button',
  component: BaseButton,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost', 'danger'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    type: { control: 'select', options: ['button', 'submit', 'reset'] },
    disabled: { control: 'boolean' },
    loading: { control: 'boolean' },
  },
  args: {
    variant: 'primary',
    size: 'md',
    disabled: false,
    loading: false,
    type: 'button',
    onClick: fn(),
  },
  render: (arguments_) => ({
    components: { BaseButton },
    setup() {
      return { args: arguments_ };
    },
    template: '<BaseButton v-bind="args">Click me</BaseButton>',
  }),
} satisfies Meta<typeof BaseButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  play: async ({ canvasElement, args }) => {
    // Arrange
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: /click me/i });

    // Act
    await userEvent.click(button);

    // Assert
    expect(args.onClick).toHaveBeenCalledOnce();
  },
};

export const Secondary: Story = { args: { variant: 'secondary' } };

export const Ghost: Story = { args: { variant: 'ghost' } };

export const Danger: Story = { args: { variant: 'danger' } };

export const Small: Story = { args: { size: 'sm' } };

export const Large: Story = { args: { size: 'lg' } };

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvasElement, args }) => {
    // Arrange
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: /click me/i });

    // Act — disabled button must not fire onClick
    await userEvent.click(button);

    // Assert
    expect(button).toBeDisabled();
    expect(args.onClick).not.toHaveBeenCalled();
  },
};

export const Loading: Story = { args: { loading: true } };

export const WithIconLeft: Story = {
  render: () => ({
    components: { BaseButton, IconPlus },
    template: '<BaseButton><IconPlus size="sm" /> Add item</BaseButton>',
  }),
};

export const WithIconRight: Story = {
  render: () => ({
    components: { BaseButton, IconDownload },
    template: '<BaseButton variant="secondary">Download <IconDownload size="sm" /></BaseButton>',
  }),
};

export const DangerWithIcon: Story = {
  render: () => ({
    components: { BaseButton, IconTrash },
    template: '<BaseButton variant="danger"><IconTrash size="sm" /> Delete</BaseButton>',
  }),
};
