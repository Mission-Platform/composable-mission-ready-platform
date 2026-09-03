import { ForgeInlineEdit, type InlineEditProperties } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Molecules/Forms/ForgeInlineEdit',
  component: ForgeInlineEdit,
  tags: ['autodocs'],
  args: { modelValue: 'Project name', label: 'Name' },
} satisfies Meta<InlineEditProperties>;
export default meta;
type Story = StoryObj<InlineEditProperties>;
export const Default: Story = {};
export const InitiallyEditing: Story = { args: { defaultEditing: true } };
export const Required: Story = { args: { required: true, modelValue: '' } };
export const Readonly: Story = { args: { readonly: true } };
