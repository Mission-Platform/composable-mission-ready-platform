import { ChatArea, ChatBubble } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `ChatArea` is the **React** build of the write-once `BaseChatArea` in
 * `@mission-platform/components`. It wraps an `aria-live` message log (default
 * slot, typically `ChatBubble`s) with optional `header`/`footer` slots; the
 * auto-scroll is reproduced with a single neutral `useEffect`. Authored once in
 * the neutral JSX dialect and compiled straight to React by
 * `@mission-platform/vite-plugin-jsx`.
 */
const meta = {
  title: 'Components/Communication/BaseChatArea',
  component: ChatArea,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ChatArea` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). It wraps an `aria-live` message log with optional `header`/`footer` slots and auto-scrolls to the latest message. Styling comes from the co-located `base-chat-area.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    autoScroll: { control: 'boolean' },
    autoScrollThreshold: { control: 'number' },
  },
  args: {
    autoScroll: true,
    autoScrollThreshold: 80,
    ariaLabel: 'Conversation',
  },
  render: (arguments_) => (
    <div style={{ height: 360, maxWidth: 420 }}>
      <ChatArea
        {...arguments_}
        header={<strong>Support chat</strong>}
        footer={<em>Type a message…</em>}
      >
        <ChatBubble side="start">Hi! How can I help you today?</ChatBubble>
        <ChatBubble
          side="end"
          variant="primary"
        >
          I have a question about my order.
        </ChatBubble>
        <ChatBubble side="start">Of course — what is your order number?</ChatBubble>
      </ChatArea>
    </div>
  ),
} satisfies Meta<typeof ChatArea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutChrome: Story = {
  render: (arguments_) => (
    <div style={{ height: 320, maxWidth: 420 }}>
      <ChatArea {...arguments_}>
        <ChatBubble side="start">A bare conversation, with no header or footer.</ChatBubble>
        <ChatBubble
          side="end"
          variant="primary"
        >
          Looks good!
        </ChatBubble>
      </ChatArea>
    </div>
  ),
};
