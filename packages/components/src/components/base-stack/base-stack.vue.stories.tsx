import { Stack } from '@mission-platform/components/vue';

import styles from './base-stack.module.scss';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `Stack` is the Vue 3 build of the write-once `BaseStack` in this package. The
 * component is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/forge`) and compiled straight to a Vue component at build
 * time by `@mission-platform/vite-plugin-forge`. The very same source also ships
 * as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Layout/BaseStack',
  component: Stack,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Stack` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). It lays its children out in a single vertical (column) or horizontal (row) line with a consistent `gap`, plus `justify` / `align` controls. The demo box styling comes from the co-located `base-stack.module.scss` CSS Module (consumed here through its hashed class map).',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    direction: { control: 'inline-radio', options: ['vertical', 'horizontal'] },
    gap: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    justify: { control: 'select', options: ['start', 'center', 'end', 'between', 'around', 'evenly'] },
    align: { control: 'select', options: ['start', 'center', 'end', 'stretch', 'baseline'] },
    wrap: { control: 'boolean' },
    inline: { control: 'boolean' },
    padding: { control: 'select', options: [undefined, '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    margin: { control: 'select', options: [undefined, '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
  },
  args: {
    direction: 'vertical',
    gap: 'md',
    justify: 'start',
    align: 'stretch',
    wrap: false,
    inline: false,
  },
  render: (arguments_) => ({
    components: { Stack },
    setup() {
      return { args: arguments_, styles };
    },
    template: `
      <Stack v-bind="args" :class="styles['stack-demo-container']">
        <div :class="styles['stack-demo-item']">One</div>
        <div :class="styles['stack-demo-item']">Two</div>
        <div :class="styles['stack-demo-item']">Three</div>
      </Stack>
    `,
  }),
} satisfies Meta<typeof Stack>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Vertical: Story = { args: { direction: 'vertical' } };

export const Horizontal: Story = { args: { direction: 'horizontal' } };

export const HorizontalCentered: Story = {
  args: { direction: 'horizontal', justify: 'center', align: 'center' },
};

export const SpaceBetween: Story = {
  args: { direction: 'horizontal', justify: 'between', align: 'center' },
};

export const Wrapping: Story = {
  args: { direction: 'horizontal', wrap: true, gap: 'sm' },
  render: (arguments_) => ({
    components: { Stack },
    setup() {
      return { args: arguments_, styles };
    },
    template: `
      <Stack v-bind="args" :class="styles['stack-demo-container']">
        <div v-for="n in 12" :key="n" :class="styles['stack-demo-item']">Item {{ n }}</div>
      </Stack>
    `,
  }),
};
