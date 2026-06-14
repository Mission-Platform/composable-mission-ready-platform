import { IconClose, IconPlus, IconTrash } from '@mission-platform/icons';
import { expect, fn, userEvent, within } from 'storybook/test';

import BaseIconButton from './base-icon-button.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Display/IconButton',
  component: BaseIconButton,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: [
          '`BaseIconButton` is a compact, square, icon-only button used for affordances where a',
          'visible text label would be redundant — close controls in dialog / modal / sidebar headers,',
          'toolbar actions, or chip removal.',
          '',
          'It exposes four `variant`s (`ghost`, `primary`, `secondary`, `danger`) and three `size`s.',
          'Because the button has no visible text, an accessible name is **required** via the `label` prop',
          '(applied as `aria-label`). Place an icon from `@mission-platform/icons` in the default slot.',
          'Click events are suppressed while the button is disabled.',
        ].join('\n'),
      },
    },
  },
  argTypes: {
    variant: { control: 'select', options: ['ghost', 'primary', 'secondary', 'danger'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    type: { control: 'select', options: ['button', 'submit', 'reset'] },
    disabled: { control: 'boolean' },
    label: { control: 'text' },
  },
  args: {
    label: 'Close',
    variant: 'ghost',
    size: 'md',
    disabled: false,
    type: 'button',
    onClick: fn(),
  },
  render: (arguments_) => ({
    components: { BaseIconButton, IconClose },
    setup() {
      return { args: arguments_ };
    },
    template: '<BaseIconButton v-bind="args"><IconClose size="md" /></BaseIconButton>',
  }),
} satisfies Meta<typeof BaseIconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ghost: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Default transparent affordance (close buttons, toolbars). Verifies that clicking emits a single `click`.',
      },
    },
  },
  play: async ({ canvasElement, args }) => {
    // Arrange
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: /close/i });

    // Act
    await userEvent.click(button);

    // Assert
    expect(args.onClick).toHaveBeenCalledOnce();
  },
};

export const Primary: Story = {
  args: { variant: 'primary', label: 'Add' },
  parameters: { docs: { description: { story: 'Solid brand fill for a high-emphasis icon action.' } } },
  render: (arguments_) => ({
    components: { BaseIconButton, IconPlus },
    setup() {
      return { args: arguments_ };
    },
    template: '<BaseIconButton v-bind="args"><IconPlus size="md" /></BaseIconButton>',
  }),
};

export const Secondary: Story = {
  args: { variant: 'secondary' },
  parameters: { docs: { description: { story: 'Outlined, medium-emphasis treatment.' } } },
};

export const Danger: Story = {
  args: { variant: 'danger', label: 'Delete' },
  parameters: {
    docs: { description: { story: 'Destructive icon action (remove, delete). Pairs with a danger focus ring.' } },
  },
  render: (arguments_) => ({
    components: { BaseIconButton, IconTrash },
    setup() {
      return { args: arguments_ };
    },
    template: '<BaseIconButton v-bind="args"><IconTrash size="md" /></BaseIconButton>',
  }),
};

export const Small: Story = {
  args: { size: 'sm' },
  parameters: { docs: { description: { story: 'Compact size for dense surfaces (headers, table rows).' } } },
};

export const Large: Story = {
  args: { size: 'lg' },
  parameters: { docs: { description: { story: 'Larger hit area for prominent or touch-first surfaces.' } } },
};

export const Disabled: Story = {
  args: { disabled: true },
  parameters: {
    docs: {
      description: { story: 'When `disabled`, the native attribute is applied and `click` events are suppressed.' },
    },
  },
  play: async ({ canvasElement, args }) => {
    // Arrange
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: /close/i });

    // Act — disabled button must not fire onClick
    await userEvent.click(button);

    // Assert
    expect(button).toBeDisabled();
    expect(args.onClick).not.toHaveBeenCalled();
  },
};
