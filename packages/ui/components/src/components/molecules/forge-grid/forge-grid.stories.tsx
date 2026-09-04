import { ForgeGrid } from '@mission-platform/components';

import styles from './forge-grid.module.scss';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeGrid` is the write-once component of `@mission-platform/components`.
 * It is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/forge-jsx`) and compiled at build time by
 * `@mission-platform/vite-plugin-forge` to every supported framework (Vue 3,
 * React, SolidJS, Svelte, and Web Components).
 *
 * This is a single, framework-agnostic story: the bare
 * `@mission-platform/components` import auto-resolves to the framework selected
 * by the `STORYBOOK_FRAMEWORK` env var, and the JSX in `render` is compiled by
 * that framework's own transform — so the same story renders on every framework.
 */
const meta = {
  title: 'Molecules/Layout/ForgeGrid',
  component: ForgeGrid,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeGrid` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It arranges its default-slot children into a `rows` × `cols` CSS ForgeGrid with a configurable `gap`. The demo cell styling comes from the co-located `forge-grid.module.scss` CSS Module.',
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
      <div class={styles['grid-demo-container']}>
        <ForgeGrid {...arguments_}>
          {Array.from({ length: count }, (_unused, index) => (
            <div
              key={index}
              class={styles['grid-demo-cell']}
            >
              {index + 1}
            </div>
          ))}
        </ForgeGrid>
      </div>
    );
  },
} satisfies Meta<typeof ForgeGrid>;

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
    <div class={styles['grid-demo-container']}>
      <ForgeGrid {...arguments_}>
        {Array.from({ length: 8 }, (_unused, index) => (
          <div
            key={index}
            class={styles['grid-demo-cell']}
          >
            {index + 1}
          </div>
        ))}
      </ForgeGrid>
    </div>
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
