import { ForgeTagInput, type TagInputProperties } from './forge-tag-input';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Molecules/Forms/ForgeTagInput',
  component: ForgeTagInput,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    variant: { control: 'select', options: ['neutral', 'primary', 'error'] },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
    maxTags: { control: 'number' },
  },
  args: {
    modelValue: ['Vue', 'React'],
    label: 'Frameworks',
    placeholder: 'Add a framework',
    size: 'md',
    variant: 'neutral',
    loading: false,
    disabled: false,
  },
} satisfies Meta<TagInputProperties>;

export default meta;
type Story = StoryObj<TagInputProperties>;

export const Default: Story = {};
export const Limited: Story = { args: { modelValue: ['Vue'], maxTags: 2 } };
export const Loading: Story = { args: { loading: true } };
export const WithError: Story = { args: { error: 'Use a supported framework name.' } };
