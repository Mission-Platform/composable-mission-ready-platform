import { ForgeStack } from '@mission-platform/components';

import styles from './forge-stack.module.scss';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeStack` is the write-once `ForgeStack` component of `@mission-platform/components` —
 * a flexbox stack that lays its children out vertically or horizontally with a
 * consistent `gap`. This single neutral story renders on the framework selected
 * by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Atoms/Layout/ForgeStack',
  component: ForgeStack,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeStack` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It emits BEM class names plus the computed flexbox inline style driven by the `--mp-spacing-*` design tokens. The demo box styling comes from the co-located `forge-stack.module.scss`.',
      },
    },
  },
  argTypes: {
    direction: { control: 'select', options: ['vertical', 'horizontal'] },
    gap: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    justify: { control: 'select', options: ['start', 'center', 'end', 'between', 'around', 'evenly'] },
    align: { control: 'select', options: ['start', 'center', 'end', 'stretch', 'baseline'] },
    wrap: { control: 'boolean' },
    inline: { control: 'boolean' },
  },
  args: {
    direction: 'vertical',
    gap: 'md',
    justify: 'start',
    align: 'stretch',
    wrap: false,
    inline: false,
  },
  render: (arguments_) => (
    <div className={styles['stack-demo-container']}>
      <ForgeStack {...arguments_}>
        <div className={styles['stack-demo-item']}>One</div>
        <div className={styles['stack-demo-item']}>Two</div>
        <div className={styles['stack-demo-item']}>Three</div>
      </ForgeStack>
    </div>
  ),
} satisfies Meta<typeof ForgeStack>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Vertical: Story = {};

export const Horizontal: Story = { args: { direction: 'horizontal' } };

export const LargeGap: Story = { args: { direction: 'horizontal', gap: 'xl' } };

export const Centered: Story = { args: { direction: 'horizontal', justify: 'center', align: 'center' } };
