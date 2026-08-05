import { ForgeIconArrow } from '@mission-platform/icons';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeIconArrow` is a cross-framework icon
 * `ForgeIconArrow` in `@mission-platform/icons`, authored once in the neutral JSX
 * dialect (`@mission-platform/forge`) and compiled straight to both frameworks by
 * `@mission-platform/vite-plugin-forge`. This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Atoms/Navigation / Controls/ForgeIconArrow',
  component: ForgeIconArrow,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    color: { control: 'color' },
    direction: { control: 'inline-radio', options: ['up', 'right', 'down', 'left'] },
    ariaLabel: { control: 'text' },
  },
  args: { size: 'md', color: 'currentColor', direction: 'up' },
} satisfies Meta<typeof ForgeIconArrow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Small: Story = { args: { size: 'sm' } };
export const Large: Story = { args: { size: 'xl' } };

export const PointingRight: Story = { args: { direction: 'right' } };
export const PointingDown: Story = { args: { direction: 'down' } };
export const PointingLeft: Story = { args: { direction: 'left' } };
