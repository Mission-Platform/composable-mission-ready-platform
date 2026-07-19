import { Quote } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `Quote` is the **React** build of the write-once `BaseQuote` in
 * `@mission-platform/components`. The quotation goes in the default slot
 * (rendered via the composed neutral `Typography`); optional `author`/`source`
 * populate the attribution footer. Authored once in the neutral JSX dialect and
 * compiled straight to React by `@mission-platform/vite-plugin-jsx`.
 */
const meta = {
  title: 'Components/Display/BaseQuote',
  component: Quote,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Quote` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). The quotation goes in the default slot; optional `author`/`source` populate the attribution footer. Styling comes from the co-located `base-quote.module.scss`.',
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
    <Quote {...arguments_}>
      The Analytical Engine weaves algebraic patterns, just as the Jacquard loom weaves flowers and leaves.
    </Quote>
  ),
} satisfies Meta<typeof Quote>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Bordered: Story = { args: { variant: 'bordered' } };

export const Plain: Story = { args: { variant: 'plain' } };

export const Large: Story = { args: { size: 'lg' } };

export const WithoutAttribution: Story = { args: { author: undefined, source: undefined } };
