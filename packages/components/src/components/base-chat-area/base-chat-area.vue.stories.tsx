import { ChatArea, ChatBubble } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `ChatArea` is the Vue 3 build of the write-once `BaseChatArea` in this
 * package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/jsx`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-jsx`. The very same source also
 * ships as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Communication/BaseChatArea',
  component: ChatArea,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          "Cross-framework `ChatArea` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). It wraps an `aria-live` message log (default slot, typically `ChatBubble`s) with optional `header`/`footer` slots. The SFC's `onMounted`/`watch`/`ResizeObserver` auto-scroll is reproduced with a single neutral `useEffect`. Styling comes from the co-located `base-chat-area.module.scss`.",
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
  render: (arguments_) => ({
    components: { ChatArea, ChatBubble },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <div style="height: 360px; max-width: 420px;">
        <ChatArea v-bind="args">
          <template #header><strong>Support chat</strong></template>
          <li><ChatBubble side="start">Hi! How can I help you today?</ChatBubble></li>
          <li><ChatBubble side="end" variant="primary">I have a question about my order.</ChatBubble></li>
          <li><ChatBubble side="start">Of course — what is your order number?</ChatBubble></li>
          <template #footer><em>Type a message…</em></template>
        </ChatArea>
      </div>
    `,
  }),
} satisfies Meta<typeof ChatArea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutChrome: Story = {
  render: (arguments_) => ({
    components: { ChatArea, ChatBubble },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <div style="height: 320px; max-width: 420px;">
        <ChatArea v-bind="args">
          <li><ChatBubble side="start">A bare conversation, with no header or footer.</ChatBubble></li>
          <li><ChatBubble side="end" variant="primary">Looks good!</ChatBubble></li>
        </ChatArea>
      </div>
    `,
  }),
};
