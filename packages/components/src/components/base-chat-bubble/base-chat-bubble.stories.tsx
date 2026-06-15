import BaseChatBubble from './base-chat-bubble.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Communication/BaseChatBubble',
  component: BaseChatBubble,
  tags: ['autodocs'],
  argTypes: {
    side: { control: 'inline-radio', options: ['start', 'end'] },
    variant: { control: 'inline-radio', options: ['default', 'primary'] },
    author: { control: 'text' },
    timestamp: { control: 'text' },
    avatar: { control: 'text' },
    avatarAlt: { control: 'text' },
    pending: { control: 'boolean' },
  },
  args: {
    side: 'start',
    variant: 'default',
    author: 'Ada Lovelace',
    timestamp: '10:30',
    avatarAlt: 'AL',
    pending: false,
  },
  parameters: {
    docs: {
      description: {
        component:
          '`ChatBubble` is a single message in a conversation, with an optional avatar, author/timestamp meta line, and footer slot. Anchor it to the `start` (incoming) or `end` (outgoing) side. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.',
      },
    },
  },
} satisfies Meta<typeof BaseChatBubble>;

export default meta;
type Story = StoryObj<typeof meta>;

/** An incoming message anchored to the start of the conversation. */
export const Incoming: Story = {
  render: (arguments_) => ({
    components: { BaseChatBubble },
    setup: () => ({ args: arguments_ }),
    template: `<BaseChatBubble v-bind="args">Hi! How can I help you today?</BaseChatBubble>`,
  }),
};

/** An outgoing message tinted with the primary colour. */
export const Outgoing: Story = {
  args: { side: 'end', variant: 'primary', author: 'You', timestamp: '10:31', avatarAlt: 'You' },
  render: (arguments_) => ({
    components: { BaseChatBubble },
    setup: () => ({ args: arguments_ }),
    template: `<BaseChatBubble v-bind="args">I'd like to reset my password, please.</BaseChatBubble>`,
  }),
};

/** A pending (optimistic) outgoing message that has not been delivered yet. */
export const Pending: Story = {
  args: { side: 'end', variant: 'primary', author: 'You', timestamp: 'Sending…', pending: true, avatarAlt: 'You' },
  render: (arguments_) => ({
    components: { BaseChatBubble },
    setup: () => ({ args: arguments_ }),
    template: `<BaseChatBubble v-bind="args">Just sent the form through.</BaseChatBubble>`,
  }),
};
