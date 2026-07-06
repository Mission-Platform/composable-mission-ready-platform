import { Masonry } from '@mission-platform/components/vue';

import styles from './base-masonry.module.scss';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `Masonry` is the Vue 3 build of the write-once `BaseMasonry` in this package.
 * The component is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/jsx`) and compiled straight to a Vue component at build
 * time by `@mission-platform/vite-plugin-jsx`. The very same source also ships
 * as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Layout/BaseMasonry',
  component: Masonry,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Masonry` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). It flows its default-slot children into balanced, tightly-packed CSS multi-columns. The demo card styling comes from the co-located `base-masonry.module.scss` CSS Module (consumed here through its hashed class map).',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    columns: { control: { type: 'number', min: 1, max: 6, step: 1 } },
    minColumnWidth: { control: 'text' },
    gap: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    padding: { control: 'select', options: [undefined, '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    margin: { control: 'select', options: [undefined, '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
  },
  args: {
    columns: 3,
    gap: 'md',
  },
  render: (arguments_) => ({
    components: { Masonry },
    setup() {
      const heights = [120, 80, 160, 100, 200, 90, 140, 110, 180];
      return { args: arguments_, heights, styles };
    },
    template: `
      <Masonry v-bind="args">
        <div
          v-for="(height, index) in heights"
          :key="index"
          :class="styles['masonry-demo-item']"
          :style="{ height: height + 'px' }"
        >
          Item {{ index + 1 }}
        </div>
      </Masonry>
    `,
  }),
} satisfies Meta<typeof Masonry>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ThreeColumns: Story = { args: { columns: 3 } };

export const TwoColumns: Story = { args: { columns: 2 } };

export const Responsive: Story = { args: { minColumnWidth: '12rem' } };

export const TightGap: Story = { args: { columns: 4, gap: 'xs' } };
