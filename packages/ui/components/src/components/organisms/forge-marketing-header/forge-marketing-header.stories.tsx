import { ForgeMarketingHeader } from './forge-marketing-header';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Organisms/Marketing/ForgeMarketingHeader',
  component: ForgeMarketingHeader,
  tags: ['autodocs'],
  args: {
    title: 'Build what matters',
    subtitle: 'Composable building blocks for ambitious teams.',
    actions: [{ id: 'start', label: 'Get started', href: '/start' }],
    align: 'center' as const,
    overlay: true,
    backgroundImage: 'https://placehold.co/1600x700',
  },
} satisfies Meta<typeof ForgeMarketingHeader>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
