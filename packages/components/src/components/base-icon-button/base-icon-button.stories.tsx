import { IconButton } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `IconButton` is the Vue 3 build of the write-once `BaseIconButton` in this
 * package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/jsx`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-jsx`. The very same source also
 * ships as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Display/BaseIconButton',
  component: IconButton,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `IconButton` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). Place the icon in the default slot; an accessible name is required via `label`. Styling comes from the co-located `base-icon-button.module.scss`. The demo uses a simple inline glyph in place of an `@mission-platform/icons` icon.',
      },
    },
  },
  argTypes: {
    label: { control: 'text' },
    variant: {
      control: 'select',
      options: [
        'ghost',
        'neutral',
        'primary',
        'secondary',
        'tertiary',
        'success',
        'warning',
        'info',
        'error',
        'critical',
      ],
    },
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    disabled: { control: 'boolean' },
    type: { control: 'select', options: ['button', 'submit', 'reset'] },
  },
  args: {
    label: 'Close',
    variant: 'ghost',
    size: 'md',
    disabled: false,
    type: 'button',
  },
  render: (arguments_) => ({
    components: { IconButton },
    setup() {
      return { args: arguments_ };
    },
    template: '<IconButton v-bind="args"><span aria-hidden="true">✕</span></IconButton>',
  }),
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ghost: Story = {};

export const Primary: Story = { args: { variant: 'primary' } };

export const Secondary: Story = { args: { variant: 'secondary' } };

export const Success: Story = { args: { variant: 'success' } };

export const Warning: Story = { args: { variant: 'warning' } };

export const Info: Story = { args: { variant: 'info' } };

export const Error: Story = { args: { variant: 'error' } };

export const Critical: Story = { args: { variant: 'critical' } };

export const Disabled: Story = { args: { disabled: true } };
