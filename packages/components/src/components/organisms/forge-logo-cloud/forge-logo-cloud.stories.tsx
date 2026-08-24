import { ForgeLogoCloud } from './forge-logo-cloud';

import type { LogoCloudProperties } from './forge-logo-cloud';
import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Organisms/Marketing/ForgeLogoCloud',
  component: ForgeLogoCloud,
  tags: ['autodocs'],
  args: {
    title: 'Trusted by innovative teams',
    logos: [
      { id: 'one', name: 'Acme', src: 'https://placehold.co/180x60?text=Acme' },
      { id: 'two', name: 'Orbit', src: 'https://placehold.co/180x60?text=Orbit' },
    ],
    variant: 'default' as const,
    grayscale: true,
    columns: 4,
  },
} satisfies Meta<typeof ForgeLogoCloud>;
export default meta;
type Story = StoryObj<LogoCloudProperties>;
export const Default: Story = {};
export const Compact: Story = { args: { variant: 'compact', columns: 2 } };
