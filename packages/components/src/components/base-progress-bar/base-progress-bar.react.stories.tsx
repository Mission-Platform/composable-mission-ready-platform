import { ProgressBar } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `ProgressBar` is the **React** build of the write-once `BaseProgressBar` in
 * `@mission-platform/components` — a native `<progress>` track with a tone/size,
 * an optional label row (via the composed neutral `Typography`), and an
 * indeterminate mode. Authored once in the neutral JSX dialect and compiled
 * straight to React by `@mission-platform/vite-plugin-jsx`.
 */
const meta = {
  title: 'Components/Feedback/BaseProgressBar',
  component: ProgressBar,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ProgressBar` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). It renders a native `<progress>` track with a tone/size, an optional label row, and an indeterminate mode. Styling comes from the co-located `base-progress-bar.module.scss`.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['neutral', 'primary', 'secondary', 'tertiary', 'success', 'warning', 'info', 'error', 'critical'],
    },
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    value: { control: { type: 'range', min: 0, max: 100, step: 1 } },
    showLabel: { control: 'boolean' },
    indeterminate: { control: 'boolean' },
  },
  args: {
    value: 60,
    max: 100,
    variant: 'primary',
    size: 'md',
    showLabel: false,
    indeterminate: false,
    label: 'Uploading…',
  },
  render: (arguments_) => (
    <ProgressBar
      {...arguments_}
      style={{ maxWidth: 400 }}
    />
  ),
} satisfies Meta<typeof ProgressBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithLabel: Story = { args: { label: 'Loading files', showLabel: true, value: 45 } };

export const Indeterminate: Story = { args: { indeterminate: true, label: 'Processing…' } };

export const Success: Story = { args: { variant: 'success', value: 100, showLabel: true } };

export const Error: Story = {
  args: { variant: 'error', value: 30, showLabel: true, label: 'Error' },
};

export const Critical: Story = {
  args: { variant: 'critical', value: 15, showLabel: true, label: 'Critical' },
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 400 }}>
      <ProgressBar
        size="sm"
        value={40}
      />
      <ProgressBar
        size="md"
        value={60}
      />
      <ProgressBar
        size="lg"
        value={80}
      />
    </div>
  ),
};
