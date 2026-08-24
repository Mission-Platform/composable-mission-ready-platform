import { ForgeDropZone, type DropZoneProperties } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Molecules/Forms/ForgeDropZone',
  component: ForgeDropZone,
  tags: ['autodocs'],
  args: {
    label: 'Attachments',
    multiple: true,
    accept: 'image/*,.pdf',
  },
} satisfies Meta<DropZoneProperties>;
export default meta;
type Story = StoryObj<DropZoneProperties>;
export const Default: Story = {};
export const SingleFile: Story = { args: { multiple: false } };
export const WithError: Story = { args: { maxFiles: 0 } };
