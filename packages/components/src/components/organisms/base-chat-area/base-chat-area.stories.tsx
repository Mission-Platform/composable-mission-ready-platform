import { h } from '@mission-platform/forge';

import { ChatArea, ChatBubble } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ChatArea` is the write-once component of `@mission-platform/components`.
 * It is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/forge`) and compiled at build time by
 * `@mission-platform/vite-plugin-forge` to every supported framework (Vue 3,
 * React, SolidJS, Svelte, and Web Components).
 *
 * This is a single, framework-agnostic story: the bare
 * `@mission-platform/components` import auto-resolves to the framework selected
 * by the `STORYBOOK_FRAMEWORK` env var, and the JSX in `render` is compiled by
 * that framework's own transform — so the same story renders on every framework.
 */
const meta = {
  title: 'Organisms/Communication/BaseChatArea',
  component: ChatArea,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ChatArea` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It wraps an `aria-live` message log (default slot, typically `ChatBubble`s) with optional `header`/`footer` slots. The SFC auto-scroll is reproduced with a single neutral `useEffect`. Styling comes from the co-located `base-chat-area.module.scss`.',
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
    <div style={{ height: '360px', maxWidth: '420px' }}>
      <ChatArea
        {...arguments_}
        header={<strong>Support chat</strong>}
        footer={<em>Type a message…</em>}
      >
        <ChatBubble side="start">Hi! How can I help you today?</ChatBubble>
        <ChatBubble side="end" variant="primary">
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
    <div style={{ height: '320px', maxWidth: '420px' }}>
      <ChatArea {...arguments_}>
        <ChatBubble side="start">A bare conversation, with no header or footer.</ChatBubble>
        <ChatBubble side="end" variant="primary">
          Looks good!
        </ChatBubble>
      </ChatArea>
    </div>
  ),
};
