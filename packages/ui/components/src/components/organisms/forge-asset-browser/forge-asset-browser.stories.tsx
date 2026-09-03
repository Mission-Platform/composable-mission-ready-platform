import { ForgeAssetBrowser } from '@mission-platform/components';

import type { AssetBrowserProperties } from '@mission-platform/components';
import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const items = [
  { id: 'mountain', name: 'Mountain', src: 'https://picsum.photos/seed/mountain/320/240', metadata: 'JPEG · 2 MB' },
  { id: 'forest', name: 'Forest', src: 'https://picsum.photos/seed/forest/320/240', metadata: 'PNG · 1 MB' },
  { id: 'ocean', name: 'Ocean', src: 'https://picsum.photos/seed/ocean/320/240', metadata: 'WEBP · 800 KB' },
];

const meta = {
  title: 'Organisms/Media/ForgeAssetBrowser',
  component: ForgeAssetBrowser,
  tags: ['autodocs'],
  args: { items, view: 'grid', selectable: true, uploadable: true },
} satisfies Meta<typeof ForgeAssetBrowser>;

export default meta;
type Story = StoryObj<AssetBrowserProperties>;

export const Default: Story = {};
export const NonSelectable: Story = { args: { selectable: false } };
export const ListView: Story = { args: { view: 'list' } };
