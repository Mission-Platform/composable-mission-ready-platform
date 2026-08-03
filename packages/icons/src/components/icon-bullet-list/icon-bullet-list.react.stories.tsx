import { IconBulletList } from '@mission-platform/icons/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `IconBulletList` is the React build of the cross-framework icon
 * `IconBulletList` in `@mission-platform/icons`, authored once in the neutral JSX
 * dialect (`@mission-platform/forge`) and compiled straight to both frameworks by
 * `@mission-platform/vite-plugin-forge`. The very same source also ships via the
 * package's `./vue` subpath.
 */
const meta = {
  title: 'Icons/Text Formatting/IconBulletList',
  component: IconBulletList,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    color: { control: 'color' },
    ariaLabel: { control: 'text' },
  },
  args: { size: 'md', color: 'currentColor' },
} satisfies Meta<typeof IconBulletList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Small: Story = { args: { size: 'sm' } };
export const Large: Story = { args: { size: 'xl' } };
