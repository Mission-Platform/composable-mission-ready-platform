import { ForgeChatBubble } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeChatBubble` is the write-once component of `@mission-platform/components`.
 * It is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/forge-jsx`) and compiled at build time by
 * `@mission-platform/vite-plugin-forge` to every supported framework (Vue 3,
 * React, SolidJS, Svelte, and Web Components).
 *
 * This is a single, framework-agnostic story: the bare
 * `@mission-platform/components` import auto-resolves to the framework selected
 * by the `STORYBOOK_FRAMEWORK` env var, and the JSX in `render` is compiled by
 * that framework's own transform — so the same story renders on every framework.
 */
const meta = {
  title: 'Molecules/Communication/ForgeChatBubble',
  component: ForgeChatBubble,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeChatBubble` — authored once in the neutral JSX dialect and shipped to all supported frameworks. A single message bubble (`<li>`) with an optional avatar (composed `ForgeAvatar`), a meta line (`author`/`timestamp`), and the message body in the default slot; the SFC `avatar`/`footer` named slots become the `avatarContent`/`footer` content props. Styling comes from the co-located `forge-chat-bubble.module.scss`.',
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
    <ul
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: 0,
        margin: 0,
        listStyle: 'none',
      }}
    >
      <ForgeChatBubble {...arguments_}>Hello! How can I help you today?</ForgeChatBubble>
    </ul>
  ),
} satisfies Meta<typeof ForgeChatBubble>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Incoming: Story = {};

export const Outgoing: Story = { args: { side: 'end', variant: 'primary', author: 'You', avatarAlt: 'YO' } };

export const Pending: Story = { args: { side: 'end', variant: 'primary', pending: true, timestamp: 'Sending…' } };

export const Conversation: Story = {
  render: () => (
    <ul
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: 0,
        margin: 0,
        listStyle: 'none',
      }}
    >
      <ForgeChatBubble
        side="start"
        author="Ada"
        timestamp="12:30"
        avatarAlt="AL"
      >
        Hi, is this thing on?
      </ForgeChatBubble>
      <ForgeChatBubble
        side="end"
        variant="primary"
        author="You"
        timestamp="12:31"
        avatarAlt="YO"
      >
        Loud and clear!
      </ForgeChatBubble>
      <ForgeChatBubble
        side="start"
        author="Ada"
        timestamp="12:32"
        avatarAlt="AL"
      >
        Great, let&apos;s get started.
      </ForgeChatBubble>
    </ul>
  ),
};
