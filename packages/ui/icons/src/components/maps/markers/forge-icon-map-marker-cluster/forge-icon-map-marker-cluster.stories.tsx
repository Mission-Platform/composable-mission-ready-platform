import { ForgeIconMapMarkerCluster } from '@mission-platform/icons';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'icons/maps/markers/forge-icon-map-marker-cluster',
  component: ForgeIconMapMarkerCluster,
  tags: ['autodocs'],
  args: { size: 'md', ariaLabel: 'Map marker cluster' },
} satisfies Meta<typeof ForgeIconMapMarkerCluster>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
