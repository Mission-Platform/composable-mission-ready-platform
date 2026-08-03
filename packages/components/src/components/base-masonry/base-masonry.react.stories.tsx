import { Masonry } from '@mission-platform/components/react';

import styles from './base-masonry.module.scss';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `Masonry` is the **React** build of the write-once `BaseMasonry` in
 * `@mission-platform/components` — it flows its default-slot children into
 * balanced, tightly-packed CSS multi-columns. Authored once in the neutral JSX
 * dialect and compiled straight to React by `@mission-platform/vite-plugin-forge`.
 */
const meta = {
  title: 'Components/Layout/BaseMasonry',
  component: Masonry,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Masonry` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). It flows its default-slot children into balanced, tightly-packed CSS multi-columns. The demo card styling comes from the co-located `base-masonry.module.scss` CSS Module.',
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
      <Masonry {...arguments_}>
        {heights.map((height, index) => (
          <div
            key={index}
            className={styles['masonry-demo-item']}
            style={{ height: `${height}px` }}
          >
            Item {index + 1}
          </div>
        ))}
      </Masonry>
    );
  },
} satisfies Meta<typeof Masonry>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ThreeColumns: Story = { args: { columns: 3 } };

export const TwoColumns: Story = { args: { columns: 2 } };

export const Responsive: Story = { args: { minColumnWidth: '12rem' } };

export const TightGap: Story = { args: { columns: 4, gap: 'xs' } };
