import { IconDownload, IconPlus, IconTrash } from '@mission-platform/icons';
import { expect, fn, userEvent, within } from 'storybook/test';

import BaseButton from './base-button.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Display/BaseButton',
  component: BaseButton,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: [
          '`BaseButton` is the foundational interactive element used across Mission Platform apps.',
          '',
          'It exposes nine visual `variant`s (`primary`, `secondary`, `tertiary`, `default`, `success`, `warning`, `information`, `error`, `critical`), three `size`s,',
          'and built-in `disabled` and `loading` states. The default slot accepts plain text and/or icons',
          'from `@mission-platform/icons`. Click events are suppressed while the button is disabled or loading,',
          'and the loading spinner exposes a localised `aria-label` via `vue-i18n`.',
        ].join('\n'),
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'primary',
        'secondary',
        'tertiary',
        'default',
        'success',
        'warning',
        'information',
        'error',
        'critical',
      ],
    },
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
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
  parameters: {
    docs: {
      description: {
        story: 'Default primary call-to-action button. Verifies that clicking emits a single `click` event.',
      },
    },
  },
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

export const Secondary: Story = {
  args: { variant: 'secondary' },
  parameters: {
    docs: { description: { story: 'Lower-emphasis action. Use for secondary actions alongside a primary button.' } },
  },
};

export const Tertiary: Story = {
  args: { variant: 'tertiary' },
  parameters: {
    docs: {
      description: {
        story:
          'Transparent background (ghost). Use inside toolbars, menus, or dense surfaces where chrome should recede.',
      },
    },
  },
};

export const Default: Story = {
  args: { variant: 'default' },
  parameters: {
    docs: { description: { story: 'Neutral, intent-free solid fill for generic actions.' } },
  },
};

export const Success: Story = {
  args: { variant: 'success' },
  parameters: { docs: { description: { story: 'Positive / confirming action.' } } },
};

export const Warning: Story = {
  args: { variant: 'warning' },
  parameters: { docs: { description: { story: 'Cautionary action requiring attention.' } } },
};

export const Information: Story = {
  args: { variant: 'information' },
  parameters: { docs: { description: { story: 'Informational action.' } } },
};

export const Error: Story = {
  args: { variant: 'error' },
  parameters: {
    docs: {
      description: { story: 'Destructive action (delete, remove, leave). Pairs with a danger-tinted focus ring.' },
    },
  },
};

export const Critical: Story = {
  args: { variant: 'critical' },
  parameters: {
    docs: {
      description: {
        story: 'Most severe / irreversible action — one step beyond `error`. Pairs with a danger-tinted focus ring.',
      },
    },
  },
};

export const Small: Story = {
  args: { size: 'sm' },
  parameters: { docs: { description: { story: 'Compact size for dense layouts (toolbars, table rows).' } } },
};

export const Large: Story = {
  args: { size: 'lg' },
  parameters: {
    docs: { description: { story: 'Prominent size for marketing surfaces and primary calls-to-action.' } },
  },
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
    const button = canvas.getByRole('button', { name: /click me/i });

    // Act — disabled button must not fire onClick
    await userEvent.click(button);

    // Assert
    expect(button).toBeDisabled();
    expect(args.onClick).not.toHaveBeenCalled();
  },
};

export const Loading: Story = {
  args: { loading: true },
  parameters: {
    docs: {
      description: {
        story: 'Sets `aria-busy="true"`, displays the spinner, and suppresses `click` until loading ends.',
      },
    },
  },
};

export const WithIconLeft: Story = {
  parameters: {
    docs: { description: { story: 'Leading icon pattern — place the icon before the label in the default slot.' } },
  },
  render: () => ({
    components: { BaseButton, IconPlus },
    template: '<BaseButton><IconPlus size="sm" /> Add item</BaseButton>',
  }),
};

export const WithIconRight: Story = {
  parameters: {
    docs: { description: { story: 'Trailing icon pattern — typically used for download or navigation affordances.' } },
  },
  render: () => ({
    components: { BaseButton, IconDownload },
    template: '<BaseButton variant="secondary">Download <IconDownload size="sm" /></BaseButton>',
  }),
};

export const ErrorWithIcon: Story = {
  parameters: { docs: { description: { story: 'Destructive variant with a leading icon to reinforce intent.' } } },
  render: () => ({
    components: { BaseButton, IconTrash },
    template: '<BaseButton variant="error"><IconTrash size="sm" /> Delete</BaseButton>',
  }),
};
