import { Spinner } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `Spinner` is the Vue 3 build of the write-once `BaseSpinner` in this package.
 * The component is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/jsx`) and compiled straight to a Vue component at build
 * time by `@mission-platform/vite-plugin-jsx`. The very same source also ships
 * as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Feedback/BaseSpinner',
  component: Spinner,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Spinner` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). It renders a `role="status"` ring with a tone/size; the accessible `label` defaults to `Loading…` (the original i18n source is not part of this library). Styling comes from the co-located `base-spinner.module.scss`.',
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
  render: (arguments_) => ({
    components: { Spinner },
    setup() {
      return { args: arguments_ };
    },
    template: '<Spinner v-bind="args" />',
  }),
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sizes: Story = {
  render: () => ({
    components: { Spinner },
    template: `
      <div style="display: flex; align-items: center; gap: 16px;">
        <Spinner size="xs" />
        <Spinner size="sm" />
        <Spinner size="md" />
        <Spinner size="lg" />
        <Spinner size="xl" />
      </div>
    `,
  }),
};

export const Variants: Story = {
  render: () => ({
    components: { Spinner },
    template: `
      <div style="display: flex; align-items: center; gap: 16px;">
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
    `,
  }),
};
