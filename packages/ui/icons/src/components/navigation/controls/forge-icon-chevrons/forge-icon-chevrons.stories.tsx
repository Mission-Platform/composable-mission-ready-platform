import { ForgeIconChevrons } from '@mission-platform/icons';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeIconChevrons` is a cross-framework icon
 * `ForgeIconChevrons` in `@mission-platform/icons`, authored once in the neutral JSX
 * dialect (`@mission-platform/forge-jsx`) and compiled straight to both frameworks by
 * `@mission-platform/vite-plugin-forge`. This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'icons/navigation/controls/forge-icon-chevrons',
  component: ForgeIconChevrons,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    color: { control: 'color' },
    direction: { control: 'inline-radio', options: ['up', 'right', 'down', 'left'] },
    ariaLabel: { control: 'text' },
  },
  args: { size: 'md', color: 'currentColor', direction: 'right' },
} satisfies Meta<typeof ForgeIconChevrons>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Left: Story = { args: { direction: 'left' } };
export const Large: Story = { args: { size: 'xl' } };
