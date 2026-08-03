import { StatusIcon } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `StatusIcon` is the **React** build of the write-once `BaseStatusIcon` in
 * `@mission-platform/components` — a toned glyph per status (`✓`/`⚠`/`✕`/`ℹ`/`–`)
 * with `role="img"` when labelled. Authored once in the neutral JSX dialect and
 * compiled straight to React by `@mission-platform/vite-plugin-forge`.
 */
const meta = {
  title: 'Components/Feedback/BaseStatusIcon',
  component: StatusIcon,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `StatusIcon` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). It renders a toned glyph per status with `role="img"` when labelled. Styling comes from the co-located `base-status-icon.module.scss`.',
      },
    },
  },
  argTypes: {
    status: {
      control: 'select',
      options: ['neutral', 'primary', 'secondary', 'tertiary', 'success', 'warning', 'info', 'error', 'critical'],
    },
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    label: { control: 'text' },
  },
  args: {
    status: 'neutral',
    size: 'md',
  },
  render: (arguments_) => <StatusIcon {...arguments_} />,
} satisfies Meta<typeof StatusIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Success: Story = { args: { status: 'success', label: 'Success' } };

export const Statuses: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <StatusIcon status="neutral" />
      <StatusIcon status="primary" />
      <StatusIcon status="secondary" />
      <StatusIcon status="tertiary" />
      <StatusIcon status="success" />
      <StatusIcon status="warning" />
      <StatusIcon status="info" />
      <StatusIcon status="error" />
      <StatusIcon status="critical" />
    </div>
  ),
};
