import { Spinner } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `Spinner` is the **React** build of the write-once `BaseSpinner` in
 * `@mission-platform/components` — a `role="status"` ring with a tone/size; the
 * accessible `label` defaults to `Loading…`. Authored once in the neutral JSX
 * dialect and compiled straight to React by `@mission-platform/vite-plugin-forge`.
 */
const meta = {
  title: 'Components/Feedback/BaseSpinner',
  component: Spinner,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Spinner` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). It renders a `role="status"` ring with a tone/size; the accessible `label` defaults to `Loading…`. Styling comes from the co-located `base-spinner.module.scss`.',
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
