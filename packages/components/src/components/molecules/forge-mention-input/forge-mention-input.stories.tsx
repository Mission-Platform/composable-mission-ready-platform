import { ForgeMentionInput, type MentionInputProperties } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Molecules/Forms/ForgeMentionInput',
  component: ForgeMentionInput,
  tags: ['autodocs'],
  args: {
    modelValue: '',
    label: 'Comment',
    placeholder: 'Mention a teammate with @',
    items: [
      { id: '1', label: 'Ada' },
      { id: '2', label: 'Grace' },
      { id: '3', label: 'Linus' },
    ],
  },
} satisfies Meta<MentionInputProperties>;
export default meta;
type Story = StoryObj<MentionInputProperties>;
export const Default: Story = {};
export const WithHint: Story = { args: { hint: 'Use @ to mention someone.' } };
export const Required: Story = { args: { required: true } };
