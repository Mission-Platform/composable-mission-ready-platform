import { Badge } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `Badge` is the **React** build of the write-once `BaseBadge` in
 * `@mission-platform/components`. The component is authored **once** in the
 * framework-neutral JSX dialect (`@mission-platform/jsx`) and compiled straight
 * to a React component at build time by `@mission-platform/vite-plugin-jsx`.
 * The very same source also ships as a Vue 3 component via the package's
 * `./vue` subpath (see the Vue Storybook).
 */
const meta = {
  title: 'Components/Display/BaseBadge',
  component: Badge,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Badge` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). The component owns its `@layer mp.components` styling via the co-located `base-badge.module.scss` (shipped in the built package CSS) and assembles its BEM class names with the neutral `classNames` helper.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['neutral', 'primary', 'secondary', 'success', 'warning', 'info', 'error', 'critical'],
    },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    pill: { control: 'boolean' },
  },
  args: {
    variant: 'neutral',
    size: 'md',
    pill: false,
  },
  render: (arguments_) => <Badge {...arguments_}>Label</Badge>,
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Neutral: Story = {};

export const Primary: Story = { args: { variant: 'primary' } };

export const Secondary: Story = { args: { variant: 'secondary' } };

export const Success: Story = { args: { variant: 'success' } };

export const Warning: Story = { args: { variant: 'warning' } };

export const Error: Story = { args: { variant: 'error' } };

export const Pill: Story = { args: { variant: 'primary', pill: true } };

export const Small: Story = { args: { size: 'sm' } };

export const Large: Story = { args: { size: 'lg' } };
