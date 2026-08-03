import { StatusIcon } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `StatusIcon` is the Vue 3 build of the write-once `BaseStatusIcon` in this
 * package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/forge`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-forge`. The very same source also
 * ships as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Feedback/BaseStatusIcon',
  component: StatusIcon,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `StatusIcon` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). It renders a toned glyph per status (`✓`/`⚠`/`✕`/`ℹ`/`–`, substituted for the original `@mission-platform/icons` SVGs) with `role="img"` when labelled. Styling comes from the co-located `base-status-icon.module.scss`.',
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
  render: (arguments_) => ({
    components: { StatusIcon },
    setup() {
      return {
        status: arguments_.status,
        size: arguments_.size,
        label: arguments_.label,
      };
    },
    template: '<StatusIcon :status="status" :size="size" :label="label" />',
  }),
} satisfies Meta<typeof StatusIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Success: Story = { args: { status: 'success', label: 'Success' } };

export const Statuses: Story = {
  render: () => ({
    components: { StatusIcon },
    template: `
      <div style="display: flex; align-items: center; gap: 16px;">
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
    `,
  }),
};
