import { Avatar } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `Avatar` is the **React** build of the write-once `BaseAvatar` in
 * `@mission-platform/components` — a user/entity avatar that shows (in
 * priority order) an image, fallback initials, or its default slot, optionally
 * with a presence-status corner dot. Authored once in the neutral JSX dialect
 * and compiled straight to React by `@mission-platform/vite-plugin-jsx`.
 */
const meta = {
  title: 'Components/Display/BaseAvatar',
  component: Avatar,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Avatar` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). It lays itself out with inline styles driven by design tokens, sized by the canonical `2xs … 2xl` scale.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    shape: { control: 'select', options: ['circle', 'square'] },
    status: { control: 'select', options: [undefined, 'online', 'offline', 'away', 'busy'] },
    initials: { control: 'text' },
    src: { control: 'text' },
  },
  args: {
    initials: 'MP',
    size: 'md',
    shape: 'circle',
  },
  render: (arguments_) => <Avatar {...arguments_} />,
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Initials: Story = {};

export const Square: Story = { args: { shape: 'square' } };

export const Large: Story = { args: { size: 'xl' } };

export const Online: Story = { args: { status: 'online' } };

export const Image: Story = {
  args: {
    initials: undefined,
    src: 'https://i.pravatar.cc/96?img=12',
    alt: 'Example user',
    size: 'xl',
  },
};
