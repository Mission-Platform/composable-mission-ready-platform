import { ChatBubble } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `ChatBubble` is the Vue 3 build of the write-once `BaseChatBubble` in this
 * package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/jsx`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-jsx`. The very same source also
 * ships as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Communication/BaseChatBubble',
  component: ChatBubble,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ChatBubble` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). A single message bubble (`<li>`) with an optional avatar (composed `BaseAvatar`), a meta line (`author`/`timestamp`), and the message body in the default slot; the SFC `avatar`/`footer` named slots become the `avatarContent`/`footer` content props. Styling comes from the co-located `base-chat-bubble.module.scss`.',
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
  render: (arguments_) => ({
    components: { ChatBubble },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <ul style="display: flex; flex-direction: column; gap: 12px; padding: 0; margin: 0; list-style: none;">
        <ChatBubble v-bind="args">Hello! How can I help you today?</ChatBubble>
      </ul>
    `,
  }),
} satisfies Meta<typeof ChatBubble>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Incoming: Story = {};

export const Outgoing: Story = { args: { side: 'end', variant: 'primary', author: 'You', avatarAlt: 'YO' } };

export const Pending: Story = { args: { side: 'end', variant: 'primary', pending: true, timestamp: 'Sending…' } };

export const Conversation: Story = {
  render: () => ({
    components: { ChatBubble },
    template: `
      <ul style="display: flex; flex-direction: column; gap: 12px; padding: 0; margin: 0; list-style: none;">
        <ChatBubble side="start" author="Ada" timestamp="12:30" avatar-alt="AL">Hi, is this thing on?</ChatBubble>
        <ChatBubble side="end" variant="primary" author="You" timestamp="12:31" avatar-alt="YO">Loud and clear!</ChatBubble>
        <ChatBubble side="start" author="Ada" timestamp="12:32" avatar-alt="AL">Great, let's get started.</ChatBubble>
      </ul>
    `,
  }),
};
