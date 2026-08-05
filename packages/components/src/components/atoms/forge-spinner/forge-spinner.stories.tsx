import { h } from '@mission-platform/forge';

import { ForgeSpinner } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeSpinner` is the write-once `ForgeSpinner` component of `@mission-platform/components` — a `role="status"` ring with a tone/size; the
 * accessible `label` defaults to `Loading…`.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Atoms/Feedback/ForgeSpinner',
  component: ForgeSpinner,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeSpinner` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It renders a `role="status"` ring with a tone/size; the accessible `label` defaults to `Loading…`. Styling comes from the co-located `forge-spinner.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    variant: {
      control: 'select',
      options: ['neutral', 'primary', 'secondary', 'tertiary', 'success', 'warning', 'info', 'error', 'critical'],
    },
    label: { control: 'text' },
  },
  args: {
    size: 'md',
    variant: 'primary',
  },
  render: (arguments_) => <ForgeSpinner {...arguments_} />,
} satisfies Meta<typeof ForgeSpinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <ForgeSpinner size="xs" />
      <ForgeSpinner size="sm" />
      <ForgeSpinner size="md" />
      <ForgeSpinner size="lg" />
      <ForgeSpinner size="xl" />
    </div>
  ),
};

export const Variants: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <ForgeSpinner variant="neutral" />
      <ForgeSpinner variant="primary" />
      <ForgeSpinner variant="secondary" />
      <ForgeSpinner variant="tertiary" />
      <ForgeSpinner variant="success" />
      <ForgeSpinner variant="warning" />
      <ForgeSpinner variant="info" />
      <ForgeSpinner variant="error" />
      <ForgeSpinner variant="critical" />
    </div>
  ),
};
