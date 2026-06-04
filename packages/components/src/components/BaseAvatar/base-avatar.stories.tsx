import BaseAvatar from './BaseAvatar.vue';

import type { AvatarShape, AvatarSize, AvatarStatus } from './BaseAvatar.vue';
import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Display/Avatar',
  component: BaseAvatar,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl'] as AvatarSize[] },
    shape: { control: 'select', options: ['circle', 'square'] as AvatarShape[] },
    status: {
      control: 'select',
      options: [undefined, 'online', 'offline', 'away', 'busy'] as (AvatarStatus | undefined)[],
    },
    src: { control: 'text' },
    alt: { control: 'text' },
    initials: { control: 'text' },
    color: { control: 'text' },
  },
  args: {
    size: 'md',
    shape: 'circle',
    status: undefined,
    initials: 'MP',
  },
  render: (arguments_) => ({
    components: { BaseAvatar },
    setup() {
      return { args: arguments_ };
    },
    template: '<BaseAvatar v-bind="args" />',
  }),
} satisfies Meta<typeof BaseAvatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Initials: Story = {
  args: { initials: 'MP' },
};

export const WithImage: Story = {
  args: {
    src: 'https://i.pravatar.cc/80?img=1',
    alt: 'User avatar',
    initials: undefined,
  },
};

export const Sizes: Story = {
  render: () => ({
    components: { BaseAvatar },
    template: `
      <div style="display: flex; align-items: center; gap: var(--mp-spacing-4);">
        <BaseAvatar size="xs" initials="XS" />
        <BaseAvatar size="sm" initials="SM" />
        <BaseAvatar size="md" initials="MD" />
        <BaseAvatar size="lg" initials="LG" />
        <BaseAvatar size="xl" initials="XL" />
      </div>
    `,
  }),
};

export const Shapes: Story = {
  render: () => ({
    components: { BaseAvatar },
    template: `
      <div style="display: flex; align-items: center; gap: var(--mp-spacing-4);">
        <BaseAvatar shape="circle" initials="CI" />
        <BaseAvatar shape="square" initials="SQ" />
      </div>
    `,
  }),
};

export const Statuses: Story = {
  render: () => ({
    components: { BaseAvatar },
    template: `
      <div style="display: flex; align-items: center; gap: var(--mp-spacing-4);">
        <BaseAvatar initials="ON" status="online" />
        <BaseAvatar initials="OF" status="offline" />
        <BaseAvatar initials="AW" status="away" />
        <BaseAvatar initials="BU" status="busy" />
      </div>
    `,
  }),
};

export const Colors: Story = {
  render: () => ({
    components: { BaseAvatar },
    template: `
      <div style="display: flex; align-items: center; gap: var(--mp-spacing-4);">
        <BaseAvatar initials="A" color="var(--mp-color-primary-default)" />
        <BaseAvatar initials="B" color="var(--mp-color-success-hover)" />
        <BaseAvatar initials="C" color="var(--mp-color-warning-text)" />
        <BaseAvatar initials="D" color="var(--mp-color-danger-default)" />
        <BaseAvatar initials="E" color="var(--mp-color-info-default)" />
      </div>
    `,
  }),
};

export const AvatarGroup: Story = {
  render: () => ({
    components: { BaseAvatar },
    template: `
      <div style="display: flex; align-items: center;">
        <div style="display: flex; margin-left: 0;">
          <div style="margin-left: -8px; border: 2px solid var(--mp-color-bg-surface); border-radius: 50%;">
            <BaseAvatar size="md" initials="AB" color="var(--mp-color-primary-default)" />
          </div>
          <div style="margin-left: -8px; border: 2px solid var(--mp-color-bg-surface); border-radius: 50%;">
            <BaseAvatar size="md" initials="CD" color="var(--mp-color-success-hover)" />
          </div>
          <div style="margin-left: -8px; border: 2px solid var(--mp-color-bg-surface); border-radius: 50%;">
            <BaseAvatar size="md" initials="EF" color="var(--mp-color-warning-text)" />
          </div>
          <div style="margin-left: -8px; border: 2px solid var(--mp-color-bg-surface); border-radius: 50%;">
            <BaseAvatar size="md" initials="+3" color="var(--mp-color-text-tertiary)" />
          </div>
        </div>
      </div>
    `,
  }),
};

export const Online: Story = {
  args: {
    initials: 'JD',
    status: 'online',
    size: 'lg',
  },
};
