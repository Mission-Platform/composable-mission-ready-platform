import { List } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `List` is the **React** build of the write-once `BaseList` in
 * `@mission-platform/components` — it renders an `items` array as an
 * ordered/unordered/description/plain list (each row via the composed neutral
 * `Typography`). Authored once in the neutral JSX dialect and compiled straight
 * to React by `@mission-platform/vite-plugin-jsx`.
 */
const meta = {
  title: 'Components/Display/BaseList',
  component: List,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `List` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). It renders the `items` array as an ordered/unordered/description/plain list. Styling comes from the co-located `base-list.module.scss`.',
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
    items: [{ label: 'Compose once' }, { label: 'Compile to Vue' }, { label: 'Compile to React' }],
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
      { term: 'Ship everywhere', content: 'Compile straight to both Vue 3 and React at build time.' },
    ],
  },
};
