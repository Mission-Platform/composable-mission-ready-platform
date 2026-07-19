import { Grid } from '@mission-platform/components/react';

import styles from './base-grid.module.scss';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `Grid` is the **React** build of the write-once `BaseGrid` in
 * `@mission-platform/components`. It arranges its default-slot children into a
 * `rows` × `cols` CSS Grid with a configurable `gap`. Authored once in the
 * neutral JSX dialect and compiled straight to React by
 * `@mission-platform/vite-plugin-jsx`.
 */
const meta = {
  title: 'Components/Layout/BaseGrid',
  component: Grid,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Grid` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). It arranges its default-slot children into a `rows` × `cols` CSS Grid with a configurable `gap`. The demo cell styling comes from the co-located `base-grid.module.scss` CSS Module.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    rows: { control: { type: 'number', min: 1, max: 6, step: 1 } },
    cols: { control: { type: 'number', min: 1, max: 6, step: 1 } },
    minColumnWidth: { control: 'text' },
    gap: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    justify: { control: 'select', options: ['start', 'center', 'end', 'stretch'] },
    align: { control: 'select', options: ['start', 'center', 'end', 'stretch'] },
    padding: { control: 'select', options: [undefined, '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    margin: { control: 'select', options: [undefined, '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
  },
  args: {
    rows: 2,
    cols: 3,
    gap: 'md',
    justify: 'stretch',
    align: 'stretch',
  },
  render: (arguments_) => {
    const count = (arguments_.rows ?? 1) * (arguments_.cols ?? 1);
    return (
      <Grid
        {...arguments_}
        className={styles['grid-demo-container']}
      >
        {Array.from({ length: count }, (_unused, index) => (
          <div
            key={index}
            className={styles['grid-demo-cell']}
          >
            {index + 1}
          </div>
        ))}
      </Grid>
    );
  },
} satisfies Meta<typeof Grid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TwoByThree: Story = { args: { rows: 2, cols: 3 } };

export const SingleRow: Story = { args: { rows: 1, cols: 4 } };

export const SquareTight: Story = { args: { rows: 3, cols: 3, gap: 'xs' } };

export const Spacious: Story = { args: { rows: 2, cols: 2, gap: '2xl' } };

export const Responsive: Story = {
  name: 'Responsive (minColumnWidth)',
  parameters: {
    docs: {
      description: {
        story:
          'Setting `minColumnWidth` switches the grid to a responsive `auto-fit` track list — it fits as many equal-width columns of at least that width as the inline space allows and wraps the rest, so `cols` is ignored. Resize the preview to see the columns reflow.',
      },
    },
  },
  args: { minColumnWidth: '12rem', gap: 'md' },
  render: (arguments_) => (
    <Grid
      {...arguments_}
      className={styles['grid-demo-container']}
    >
      {Array.from({ length: 8 }, (_unused, index) => (
        <div
          key={index}
          className={styles['grid-demo-cell']}
        >
          {index + 1}
        </div>
      ))}
    </Grid>
  ),
};

export const Padded: Story = {
  name: 'Padding & Margin',
  parameters: {
    docs: {
      description: {
        story:
          'The shared `padding` / `margin` props apply the canonical `2xs … 2xl` spacing scale (each step a `--mp-spacing-*` design token) as token-driven CSS classes on the grid container.',
      },
    },
  },
  args: { rows: 2, cols: 3, gap: 'sm', padding: 'lg', margin: 'md' },
};
