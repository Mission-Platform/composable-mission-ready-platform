import { Quote } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `Quote` is the Vue 3 build of the write-once `BaseQuote` in this package. The
 * component is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/jsx`) and compiled straight to a Vue component at build
 * time by `@mission-platform/vite-plugin-jsx`. The very same source also ships
 * as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Display/BaseQuote',
  component: Quote,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Quote` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). The quotation goes in the default slot (rendered via the composed neutral `Typography`); optional `author`/`source` populate the attribution footer. Styling comes from the co-located `base-quote.module.scss`.',
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
  render: (arguments_) => ({
    components: { Quote },
    setup() {
      return { args: arguments_ };
    },
    template:
      '<Quote v-bind="args">The Analytical Engine weaves algebraic patterns, just as the Jacquard loom weaves flowers and leaves.</Quote>',
  }),
} satisfies Meta<typeof Quote>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Bordered: Story = { args: { variant: 'bordered' } };

export const Plain: Story = { args: { variant: 'plain' } };

export const Large: Story = { args: { size: 'lg' } };

export const WithoutAttribution: Story = { args: { author: undefined, source: undefined } };
