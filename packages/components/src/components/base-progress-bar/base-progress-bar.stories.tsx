import { ProgressBar } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `ProgressBar` is the Vue 3 build of the write-once `BaseProgressBar` in this
 * package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/jsx`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-jsx`. The very same source also
 * ships as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Feedback/BaseProgressBar',
  component: ProgressBar,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ProgressBar` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). It renders a native `<progress>` track with a tone/size, an optional label row (via the composed neutral `Typography`), and an indeterminate mode. Styling comes from the co-located `base-progress-bar.module.scss`.',
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
  render: (arguments_) => ({
    components: { ProgressBar },
    setup() {
      return { args: arguments_ };
    },
    template: '<ProgressBar v-bind="args" style="max-width: 400px;" />',
  }),
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
  render: () => ({
    components: { ProgressBar },
    template: `
      <div style="display: flex; flex-direction: column; gap: 12px; max-width: 400px;">
        <ProgressBar size="sm" :value="40" />
        <ProgressBar size="md" :value="60" />
        <ProgressBar size="lg" :value="80" />
      </div>
    `,
  }),
};
