import { Avatar } from '@mission-platform/components/vue';

import styles from './base-avatar.module.scss';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `Avatar` is the Vue 3 build of the write-once `BaseAvatar` in this package.
 * The component is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/jsx`) and compiled straight to a Vue component at build
 * time by `@mission-platform/vite-plugin-jsx`. The very same source also ships
 * as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Display/BaseAvatar',
  component: Avatar,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Avatar` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). It shows (in priority order) an `src` image, fallback `initials`, or the default slot, with an optional presence-status corner dot. The avatar lays itself out with inline token-driven styles; the demo row layout comes from the co-located `base-avatar.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    shape: { control: 'inline-radio', options: ['circle', 'square'] },
    status: { control: 'select', options: [undefined, 'online', 'offline', 'away', 'busy'] },
    variant: {
      control: 'select',
      options: [
        'neutral',
        'primary',
        'secondary',
        'tertiary',
        'success',
        'warning',
        'info',
        'error',
        'critical',
      ],
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
  render: (arguments_) => ({
    components: { Avatar },
    setup() {
      return { args: arguments_ };
    },
    template: '<Avatar v-bind="args" />',
  }),
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Initials: Story = {};

export const Square: Story = { args: { shape: 'square' } };

export const WithStatus: Story = { args: { status: 'online' } };

export const Variants: Story = {
  render: () => ({
    components: { Avatar },
    template: `
      <div style="display: flex; flex-wrap: wrap; gap: 8px;">
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
    `,
  }),
};

export const Image: Story = {
  args: {
    src: 'https://i.pravatar.cc/96?img=12',
    alt: 'Profile photo',
    initials: undefined,
  },
};

export const Sizes: Story = {
  render: (arguments_) => ({
    components: { Avatar },
    setup() {
      return { args: arguments_, styles };
    },
    template: `
      <div :class="styles['avatar-demo-row']">
        <Avatar v-bind="args" size="2xs" />
        <Avatar v-bind="args" size="xs" />
        <Avatar v-bind="args" size="sm" />
        <Avatar v-bind="args" size="md" />
        <Avatar v-bind="args" size="lg" />
        <Avatar v-bind="args" size="xl" />
        <Avatar v-bind="args" size="2xl" />
      </div>
    `,
  }),
};
