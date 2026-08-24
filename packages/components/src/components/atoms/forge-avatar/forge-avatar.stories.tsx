
import { ForgeAvatar } from '@mission-platform/components';

import styles from './forge-avatar.module.scss';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeAvatar` is the write-once component of `@mission-platform/components`.
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
  title: 'Atoms/Display/ForgeAvatar',
  component: ForgeAvatar,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeAvatar` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It shows (in priority order) an `src` image, fallback `initials`, or the default slot, with an optional presence-status corner dot. The avatar lays itself out with inline token-driven styles; the demo row layout comes from the co-located `forge-avatar.module.scss`.',
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
  render: (arguments_) => <ForgeAvatar {...arguments_} />,
} satisfies Meta<typeof ForgeAvatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Initials: Story = {};

export const Square: Story = { args: { shape: 'square' } };

export const WithStatus: Story = { args: { status: 'online' } };

export const Variants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      <ForgeAvatar
        variant="neutral"
        initials="N"
      />
      <ForgeAvatar
        variant="primary"
        initials="P"
      />
      <ForgeAvatar
        variant="secondary"
        initials="S"
      />
      <ForgeAvatar
        variant="tertiary"
        initials="T"
      />
      <ForgeAvatar
        variant="success"
        initials="S"
      />
      <ForgeAvatar
        variant="warning"
        initials="W"
      />
      <ForgeAvatar
        variant="info"
        initials="I"
      />
      <ForgeAvatar
        variant="error"
        initials="E"
      />
      <ForgeAvatar
        variant="critical"
        initials="C"
      />
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
      <ForgeAvatar
        {...arguments_}
        size="2xs"
      />
      <ForgeAvatar
        {...arguments_}
        size="xs"
      />
      <ForgeAvatar
        {...arguments_}
        size="sm"
      />
      <ForgeAvatar
        {...arguments_}
        size="md"
      />
      <ForgeAvatar
        {...arguments_}
        size="lg"
      />
      <ForgeAvatar
        {...arguments_}
        size="xl"
      />
      <ForgeAvatar
        {...arguments_}
        size="2xl"
      />
    </div>
  ),
};
