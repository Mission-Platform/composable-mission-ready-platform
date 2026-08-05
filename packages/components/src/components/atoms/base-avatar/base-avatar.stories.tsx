import { h } from '@mission-platform/forge';

import { Avatar } from '@mission-platform/components';

import styles from './base-avatar.module.scss';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `Avatar` is the write-once component of `@mission-platform/components`.
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
  title: 'Atoms/Display/BaseAvatar',
  component: Avatar,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Avatar` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It shows (in priority order) an `src` image, fallback `initials`, or the default slot, with an optional presence-status corner dot. The avatar lays itself out with inline token-driven styles; the demo row layout comes from the co-located `base-avatar.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    shape: { control: 'inline-radio', options: ['circle', 'square'] },
    status: { control: 'select', options: [undefined, 'online', 'offline', 'away', 'busy'] },
    variant: {
      control: 'select',
      options: ['neutral', 'primary', 'secondary', 'tertiary', 'success', 'warning', 'info', 'error', 'critical'],
    },
    src: { control: 'text' },
    initials: { control: 'text' },
    color: { control: 'text' },
  },
  args: {
    size: 'md',
    shape: 'circle',
    initials: 'AB',
  },
  render: (arguments_) => <Avatar {...arguments_} />,
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Initials: Story = {};

export const Square: Story = { args: { shape: 'square' } };

export const WithStatus: Story = { args: { status: 'online' } };

export const Variants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      <Avatar variant="neutral" initials="N" />
      <Avatar variant="primary" initials="P" />
      <Avatar variant="secondary" initials="S" />
      <Avatar variant="tertiary" initials="T" />
      <Avatar variant="success" initials="S" />
      <Avatar variant="warning" initials="W" />
      <Avatar variant="info" initials="I" />
      <Avatar variant="error" initials="E" />
      <Avatar variant="critical" initials="C" />
    </div>
  ),
};

export const Image: Story = {
  args: {
    src: 'https://i.pravatar.cc/96?img=12',
    alt: 'Profile photo',
    initials: undefined,
  },
};

export const Sizes: Story = {
  render: (arguments_) => (
    <div class={styles['avatar-demo-row']}>
      <Avatar {...arguments_} size="2xs" />
      <Avatar {...arguments_} size="xs" />
      <Avatar {...arguments_} size="sm" />
      <Avatar {...arguments_} size="md" />
      <Avatar {...arguments_} size="lg" />
      <Avatar {...arguments_} size="xl" />
      <Avatar {...arguments_} size="2xl" />
    </div>
  ),
};
