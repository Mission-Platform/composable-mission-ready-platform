import { Card } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `Card` is the Vue 3 build of the write-once `BaseCard` in this package. The
 * component is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/forge`) and compiled straight to a Vue component at build
 * time by `@mission-platform/vite-plugin-forge`. The very same source also ships
 * as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Display/BaseCard',
  component: Card,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Card` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). The body is the default slot; the bordered header/footer regions are rendered only when their `header`/`footer` named slots are filled. Styling comes from the co-located `base-card.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    padding: { control: 'select', options: ['none', 'sm', 'md', 'lg'] },
    variant: {
      control: 'select',
      options: ['neutral', 'primary', 'secondary', 'tertiary', 'success', 'warning', 'info', 'error', 'critical'],
    },
    margin: { control: 'select', options: [undefined, '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    shadow: { control: 'boolean' },
    bordered: { control: 'boolean' },
  },
  args: {
    padding: 'md',
    variant: 'neutral',
    shadow: false,
    bordered: true,
  },
  render: (arguments_) => ({
    components: { Card },
    setup() {
      return { args: arguments_ };
    },
    template: '<Card v-bind="args" style="max-width: 24rem;">A composable surface for grouping related content.</Card>',
  }),
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithHeaderAndFooter: Story = {
  render: (arguments_) => ({
    components: { Card },
    setup() {
      return { args: arguments_ };
    },
    template:
      '<Card v-bind="args" style="max-width: 24rem;"><template #header>Card title</template>A composable surface for grouping related content.<template #footer>Footer actions</template></Card>',
  }),
};

export const Shadowed: Story = {
  args: { shadow: true },
  render: (arguments_) => ({
    components: { Card },
    setup() {
      return { args: arguments_ };
    },
    template:
      '<Card v-bind="args" style="max-width: 24rem;"><template #header>Elevated</template>A composable surface for grouping related content.</Card>',
  }),
};

export const Borderless: Story = { args: { bordered: false } };

export const Success: Story = { args: { variant: 'success' } };

export const Warning: Story = { args: { variant: 'warning' } };

export const Error: Story = { args: { variant: 'error' } };

export const Variants: Story = {
  render: () => ({
    components: { Card },
    template: `
      <div style="display: flex; flex-wrap: wrap; gap: 12px;">
        <Card variant="neutral" style="width: 12rem;">Neutral</Card>
        <Card variant="primary" style="width: 12rem;">Primary</Card>
        <Card variant="secondary" style="width: 12rem;">Secondary</Card>
        <Card variant="tertiary" style="width: 12rem;">Tertiary</Card>
        <Card variant="success" style="width: 12rem;">Success</Card>
        <Card variant="warning" style="width: 12rem;">Warning</Card>
        <Card variant="info" style="width: 12rem;">Info</Card>
        <Card variant="error" style="width: 12rem;">Error</Card>
        <Card variant="critical" style="width: 12rem;">Critical</Card>
      </div>
    `,
  }),
};

export const Compact: Story = {
  args: { padding: 'sm' },
  render: (arguments_) => ({
    components: { Card },
    setup() {
      return { args: arguments_ };
    },
    template:
      '<Card v-bind="args" style="max-width: 24rem;"><template #header>Compact</template>A composable surface for grouping related content.</Card>',
  }),
};
