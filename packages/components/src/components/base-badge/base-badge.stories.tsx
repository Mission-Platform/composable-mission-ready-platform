import { Badge } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `Badge` is the Vue 3 build of the write-once `BaseBadge` in this package. The
 * component is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/jsx`) and compiled straight to a Vue functional component
 * at build time by `@mission-platform/vite-plugin-jsx`. The very same source
 * also ships as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Display/BaseBadge',
  component: Badge,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Badge` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). The component owns its `@layer mp.components` styling via the co-located `base-badge.module.scss` (shipped in the built package CSS) and assembles its BEM class names with the neutral `classNames` helper.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: [
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
    pill: { control: 'boolean' },
  },
  args: {
    variant: 'neutral',
    size: 'md',
    pill: false,
  },
  render: (arguments_) => ({
    components: { Badge },
    setup() {
      return { args: arguments_ };
    },
    template: '<Badge v-bind="args">Label</Badge>',
  }),
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

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
