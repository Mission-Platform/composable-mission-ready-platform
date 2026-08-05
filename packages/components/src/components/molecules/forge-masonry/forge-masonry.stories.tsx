import { h } from '@mission-platform/forge';

import { ForgeMasonry } from '@mission-platform/components';

import styles from './forge-masonry.module.scss';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeMasonry` is the write-once `ForgeMasonry` component of `@mission-platform/components` — it flows its default-slot children into
 * balanced, tightly-packed CSS multi-columns.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Molecules/Layout/ForgeMasonry',
  component: ForgeMasonry,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeMasonry` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It flows its default-slot children into balanced, tightly-packed CSS multi-columns. The demo card styling comes from the co-located `forge-masonry.module.scss` CSS Module.',
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
  render: (arguments_) => {
    const heights = [120, 80, 160, 100, 200, 90, 140, 110, 180];
    return (
      <ForgeMasonry {...arguments_}>
        {heights.map((height, index) => (
          <div
            key={index}
            className={styles['masonry-demo-item']}
            style={{ height: `${height}px` }}
          >
            Item {index + 1}
          </div>
        ))}
      </ForgeMasonry>
    );
  },
} satisfies Meta<typeof ForgeMasonry>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ThreeColumns: Story = { args: { columns: 3 } };

export const TwoColumns: Story = { args: { columns: 2 } };

export const Responsive: Story = { args: { minColumnWidth: '12rem' } };

export const TightGap: Story = { args: { columns: 4, gap: 'xs' } };
