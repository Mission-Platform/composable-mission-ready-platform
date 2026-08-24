
import { ForgeQuote } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeQuote` is the write-once `ForgeQuote` component of `@mission-platform/components`. The quotation goes in the default slot
 * (rendered via the composed neutral `Typography`); optional `author`/`source`
 * populate the attribution footer.
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Atoms/Display/ForgeQuote',
  component: ForgeQuote,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeQuote` — authored once in the neutral JSX dialect and shipped to all supported frameworks. The quotation goes in the default slot; optional `author`/`source` populate the attribution footer. Styling comes from the co-located `forge-quote.module.scss`.',
      },
    },
  },
  argTypes: {
    variant: { control: 'inline-radio', options: ['default', 'bordered', 'plain'] },
    tone: {
      control: 'select',
      options: ['neutral', 'primary', 'secondary', 'tertiary', 'success', 'warning', 'info', 'error', 'critical'],
    },
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    author: { control: 'text' },
    source: { control: 'text' },
    cite: { control: 'text' },
  },
  args: {
    variant: 'default',
    size: 'md',
    author: 'Ada Lovelace',
    source: 'Notes on the Analytical Engine',
  },
  render: (arguments_) => (
    <ForgeQuote {...arguments_}>
      The Analytical Engine weaves algebraic patterns, just as the Jacquard loom weaves flowers and leaves.
    </ForgeQuote>
  ),
} satisfies Meta<typeof ForgeQuote>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Bordered: Story = { args: { variant: 'bordered' } };

export const Plain: Story = { args: { variant: 'plain' } };

export const Large: Story = { args: { size: 'lg' } };

export const WithoutAttribution: Story = { args: { author: undefined, source: undefined } };
