import { h } from '@mission-platform/forge';

import { Spinner } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `Spinner` is the write-once `BaseSpinner` component of `@mission-platform/components` — a `role="status"` ring with a tone/size; the
 * accessible `label` defaults to `Loading…`.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Atoms/Feedback/BaseSpinner',
  component: Spinner,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Spinner` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It renders a `role="status"` ring with a tone/size; the accessible `label` defaults to `Loading…`. Styling comes from the co-located `base-spinner.module.scss`.',
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
  render: (arguments_) => <Spinner {...arguments_} />,
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <Spinner size="xs" />
      <Spinner size="sm" />
      <Spinner size="md" />
      <Spinner size="lg" />
      <Spinner size="xl" />
    </div>
  ),
};

export const Variants: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <Spinner variant="neutral" />
      <Spinner variant="primary" />
      <Spinner variant="secondary" />
      <Spinner variant="tertiary" />
      <Spinner variant="success" />
      <Spinner variant="warning" />
      <Spinner variant="info" />
      <Spinner variant="error" />
      <Spinner variant="critical" />
    </div>
  ),
};
