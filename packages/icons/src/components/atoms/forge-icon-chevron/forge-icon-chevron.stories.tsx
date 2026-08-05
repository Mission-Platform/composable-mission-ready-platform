import { ForgeIconChevron } from '@mission-platform/icons';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeIconChevron` is a cross-framework icon
 * `ForgeIconChevron` in `@mission-platform/icons`, authored once in the neutral JSX
 * dialect (`@mission-platform/forge`) and compiled straight to both frameworks by
 * `@mission-platform/vite-plugin-forge`. This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Atoms/Navigation / Controls/ForgeIconChevron',
  component: ForgeIconChevron,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    color: { control: 'color' },
    direction: { control: 'inline-radio', options: ['up', 'right', 'down', 'left'] },
    ariaLabel: { control: 'text' },
  },
  args: { size: 'md', color: 'currentColor', direction: 'down' },
} satisfies Meta<typeof ForgeIconChevron>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Small: Story = { args: { size: 'sm' } };
export const Large: Story = { args: { size: 'xl' } };

export const PointingUp: Story = { args: { direction: 'up' } };
export const PointingRight: Story = { args: { direction: 'right' } };
export const PointingLeft: Story = { args: { direction: 'left' } };
