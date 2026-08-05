import { h } from '@mission-platform/forge';

import { List } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `List` is the write-once component of `@mission-platform/components`.
 * It is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/forge`) and compiled at build time by
 * `@mission-platform/vite-plugin-forge` to every supported framework (Vue 3,
 * React, SolidJS, Svelte, and Web Components).
 *
 * This is a single, framework-agnostic story: the bare
 * `@mission-platform/components` import auto-resolves to the framework selected
 * by the `STORYBOOK_FRAMEWORK` env var, and the JSX in `render` is compiled by
 * that framework's own transform — so the same story renders on every framework.
 */
const meta = {
  title: 'Molecules/Display/BaseList',
  component: List,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `List` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It renders the `items` array as an ordered/unordered/description/plain list (each row via the composed neutral `Typography`). Styling comes from the co-located `base-list.module.scss`.',
      },
    },
  },
  argTypes: {
    variant: { control: 'inline-radio', options: ['unordered', 'ordered', 'description', 'none'] },
    tone: {
      control: 'select',
      options: ['neutral', 'primary', 'secondary', 'tertiary', 'success', 'warning', 'info', 'error', 'critical'],
    },
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    divided: { control: 'boolean' },
  },
  args: {
    variant: 'unordered',
    size: 'md',
    divided: false,
    items: [{ label: 'Compose once' }, { label: 'Compile to each framework' }, { label: 'Ship everywhere' }],
  },
  render: (arguments_) => <List {...arguments_} />,
} satisfies Meta<typeof List>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unordered: Story = {};

export const Ordered: Story = { args: { variant: 'ordered' } };

export const Divided: Story = { args: { divided: true } };

export const None: Story = { args: { variant: 'none' } };

export const Description: Story = {
  args: {
    variant: 'description',
    items: [
      { term: 'Author once', content: 'Write the component a single time in the neutral JSX dialect.' },
      { term: 'Ship everywhere', content: 'Compile straight to all supported frameworks at build time.' },
    ],
  },
};
