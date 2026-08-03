import { VirtualList } from '@mission-platform/components/vue';

import styles from './base-virtual-list.module.scss';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const items = Array.from({ length: 1000 }, (_, index) => ({ index, label: `Row ${index}` }));

/**
 * `VirtualList` is the Vue 3 build of the write-once `BaseVirtualList` in this
 * package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/forge`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-forge`. The very same source also
 * ships as a React component via the package's `./react` subpath.
 *
 * Only the rows within the viewport are rendered; each row is provided through
 * the scoped `row` slot, which compiles to a Vue scoped slot and a React
 * render-prop.
 */
const meta = {
  title: 'Components/Data/BaseVirtualList',
  component: VirtualList,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `VirtualList` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). It renders only the windowed rows of a large `items` array, sizing an inner spacer to the full content height; each visible row is rendered through the scoped `row` slot. Scroll position uses the neutral hooks.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    itemHeight: { control: { type: 'number' } },
    height: { control: { type: 'number' } },
    overscan: { control: { type: 'number' } },
  },
  args: {
    items,
    itemHeight: 40,
    height: 360,
    overscan: 3,
  },
  render: (arguments_) => ({
    components: { VirtualList },
    setup() {
      return { args: arguments_, styles };
    },
    template: `
      <VirtualList v-bind="args">
        <template #row="{ item, index }">
          <div :class="[styles['virtual-list-demo-row'], index % 2 === 1 ? styles['virtual-list-demo-row--alt'] : '']">
            {{ item.label }}
          </div>
        </template>
      </VirtualList>
    `,
  }),
} satisfies Meta<typeof VirtualList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ShortRows: Story = { args: { itemHeight: 24, height: 240 } };

export const TallViewport: Story = { args: { height: 560 } };
