import { IconAlignLeft } from '@mission-platform/icons/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `IconAlignLeft` is the Vue 3 build of the cross-framework icon
 * `IconAlignLeft` in `@mission-platform/icons`, authored once in the neutral JSX
 * dialect (`@mission-platform/forge`) and compiled straight to both frameworks by
 * `@mission-platform/vite-plugin-forge`. The very same source also ships via the
 * package's `./react` subpath.
 */
const meta = {
  title: 'Icons/Text Alignment/IconAlignLeft',
  component: IconAlignLeft,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    color: { control: 'color' },
    ariaLabel: { control: 'text' },
  },
  args: { size: 'md', color: 'currentColor' },
} satisfies Meta<typeof IconAlignLeft>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Small: Story = { args: { size: 'sm' } };
export const Large: Story = { args: { size: 'xl' } };
