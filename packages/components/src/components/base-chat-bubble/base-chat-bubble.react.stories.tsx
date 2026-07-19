import { ChatBubble } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `ChatBubble` is the **React** build of the write-once `BaseChatBubble` in
 * `@mission-platform/components` — a single message bubble (`<li>`) with an
 * optional avatar (composed `BaseAvatar`), a meta line (`author`/`timestamp`),
 * and the message body in the default slot; the `avatar`/`footer` named slots
 * become the `avatarContent`/`footer` content props. Authored once in the
 * neutral JSX dialect and compiled straight to React by
 * `@mission-platform/vite-plugin-jsx`.
 */
const meta = {
  title: 'Components/Communication/BaseChatBubble',
  component: ChatBubble,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ChatBubble` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). A single message bubble with an optional avatar, a meta line, and the message body in the default slot. Styling comes from the co-located `base-chat-bubble.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    side: { control: 'inline-radio', options: ['start', 'end'] },
    variant: { control: 'inline-radio', options: ['default', 'primary'] },
    pending: { control: 'boolean' },
  },
  args: {
    side: 'start',
    variant: 'default',
    author: 'Ada Lovelace',
    timestamp: '12:30',
    avatarAlt: 'AL',
    pending: false,
  },
  render: (arguments_) => (
    <ul style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 0, margin: 0, listStyle: 'none' }}>
      <ChatBubble {...arguments_}>Hello! How can I help you today?</ChatBubble>
    </ul>
  ),
} satisfies Meta<typeof ChatBubble>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Incoming: Story = {};

export const Outgoing: Story = { args: { side: 'end', variant: 'primary', author: 'You', avatarAlt: 'YO' } };

export const Pending: Story = { args: { side: 'end', variant: 'primary', pending: true, timestamp: 'Sending…' } };

export const Conversation: Story = {
  render: () => (
    <ul style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 0, margin: 0, listStyle: 'none' }}>
      <ChatBubble
        side="start"
        author="Ada"
        timestamp="12:30"
        avatarAlt="AL"
      >
        Hi, is this thing on?
      </ChatBubble>
      <ChatBubble
        side="end"
        variant="primary"
        author="You"
        timestamp="12:31"
        avatarAlt="YO"
      >
        Loud and clear!
      </ChatBubble>
      <ChatBubble
        side="start"
        author="Ada"
        timestamp="12:32"
        avatarAlt="AL"
      >
        Great, let's get started.
      </ChatBubble>
    </ul>
  ),
};
