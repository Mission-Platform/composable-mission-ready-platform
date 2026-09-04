import { ForgeIconQrCode } from '@mission-platform/icons';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeIconQrCode` is a cross-framework icon
 * `ForgeIconQrCode` in `@mission-platform/icons`, authored once in the neutral JSX
 * dialect (`@mission-platform/forge-jsx`) and compiled straight to both frameworks by
 * `@mission-platform/vite-plugin-forge`. This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'icons/objects/system/forge-icon-qr-code',
  component: ForgeIconQrCode,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    color: { control: 'color' },
    ariaLabel: { control: 'text' },
  },
  args: { size: 'md', color: 'currentColor' },
} satisfies Meta<typeof ForgeIconQrCode>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Small: Story = { args: { size: 'sm' } };
export const Large: Story = { args: { size: 'xl' } };
