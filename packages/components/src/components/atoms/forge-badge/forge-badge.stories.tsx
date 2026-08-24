
import { ForgeBadge } from '@mission-platform/components';

import type { BadgeProperties } from './forge-badge';
import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeBadge` is the write-once badge component of `@mission-platform/components`.
 * It is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/forge`) and compiled at build time by
 * `@mission-platform/vite-plugin-forge` to every supported framework (Vue 3,
 * React, SolidJS, Svelte, and Web Components).
 *
 * This is a single, framework-agnostic story: the bare
 * `@mission-platform/components` import auto-resolves to the framework selected
 * by the `STORYBOOK_FRAMEWORK` env var, and the JSX in `render` is compiled by
 * that framework's own transform — so the same story renders on every framework.
 */
const meta = {
  title: 'Atoms/Display/ForgeBadge',
  component: ForgeBadge,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeBadge` — authored once in the neutral JSX dialect and shipped to all supported frameworks. The component owns its `@layer mp.components` styling via the co-located `forge-badge.module.scss` (shipped in the built package CSS) and assembles its BEM class names with the neutral `classNames` helper.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['neutral', 'primary', 'secondary', 'tertiary', 'success', 'warning', 'info', 'error', 'critical'],
    },
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    pill: { control: 'boolean' },
  },
  args: {
    variant: 'neutral',
    size: 'md',
    pill: false,
  },
  render: (arguments_) => <ForgeBadge {...arguments_}>Label</ForgeBadge>,
} satisfies Meta<BadgeProperties>;

export default meta;
type Story = StoryObj<BadgeProperties>;

export const Neutral: Story = {};

export const Primary: Story = { args: { variant: 'primary' } };

export const Secondary: Story = { args: { variant: 'secondary' } };

export const Tertiary: Story = { args: { variant: 'tertiary' } };

export const Success: Story = { args: { variant: 'success' } };

export const Warning: Story = { args: { variant: 'warning' } };

export const Info: Story = { args: { variant: 'info' } };

export const Error: Story = { args: { variant: 'error' } };

export const Critical: Story = { args: { variant: 'critical' } };

export const Pill: Story = { args: { variant: 'primary', pill: true } };

export const Small: Story = { args: { size: 'sm' } };

export const Large: Story = { args: { size: 'lg' } };
