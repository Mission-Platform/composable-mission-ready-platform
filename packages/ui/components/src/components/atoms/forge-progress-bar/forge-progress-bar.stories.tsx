import { ForgeProgressBar } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeProgressBar` is the write-once `ForgeProgressBar` component of `@mission-platform/components` — a native `<progress>` track with a tone/size,
 * an optional label row (via the composed neutral `Typography`), and an
 * indeterminate mode.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Atoms/Feedback/ForgeProgressBar',
  component: ForgeProgressBar,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeProgressBar` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It renders a native `<progress>` track with a tone/size, an optional label row, and an indeterminate mode. Styling comes from the co-located `forge-progress-bar.module.scss`.',
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
    <div style={{ maxWidth: 400 }}>
      <ForgeProgressBar {...arguments_} />
    </div>
  ),
} satisfies Meta<typeof ForgeProgressBar>;

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
      <ForgeProgressBar
        size="sm"
        value={40}
      />
      <ForgeProgressBar
        size="md"
        value={60}
      />
      <ForgeProgressBar
        size="lg"
        value={80}
      />
    </div>
  ),
};
