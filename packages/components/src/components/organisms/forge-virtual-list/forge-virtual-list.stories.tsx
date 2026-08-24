import { ForgeVirtualList } from '@mission-platform/components';

import styles from './forge-virtual-list.module.scss';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const items = Array.from({ length: 1000 }, (_unused, index) => ({ index, label: `Row ${index}` }));

/**
 * `ForgeVirtualList` is the write-once `ForgeVirtualList` component of `@mission-platform/components`. Only the rows within the viewport are rendered;
 * each row is provided through the scoped `row` slot, which compiles to a React
 * render-prop.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Organisms/Data/ForgeVirtualList',
  component: ForgeVirtualList,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeVirtualList` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It renders only the windowed rows of a large `items` array, sizing an inner spacer to the full content height; each visible row is rendered through the scoped `row` slot (a render-prop child).',
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
  render: (arguments_) => (
    <ForgeVirtualList
      {...arguments_}
      row={({ item, index }) => {
        const rowItem = item as { index: number; label: string };
        return (
          <div
            className={`${styles['virtual-list-demo-row']} ${
              index % 2 === 1 ? styles['virtual-list-demo-row--alt'] : ''
            }`}
          >
            {rowItem.label}
          </div>
        );
      }}
    />
  ),
} satisfies Meta<typeof ForgeVirtualList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ShortRows: Story = { args: { itemHeight: 24, height: 240 } };

export const TallViewport: Story = { args: { height: 560 } };
