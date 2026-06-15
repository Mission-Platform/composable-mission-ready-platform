import { ref } from 'vue';

import BaseButton from '../base-button/base-button.vue';
import BaseChatBubble from '../base-chat-bubble/base-chat-bubble.vue';
import BaseInput from '../base-input/base-input.vue';
import BaseTypography from '../base-typography/base-typography.vue';

import BaseChatArea from './base-chat-area.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Communication/BaseChatArea',
  component: BaseChatArea,
  subcomponents: { BaseChatBubble },
  tags: ['autodocs'],
  argTypes: {
    autoScroll: { control: 'boolean' },
    autoScrollThreshold: { control: 'number' },
  },
  args: {
    autoScroll: true,
    autoScrollThreshold: 80,
    ariaLabel: 'Conversation',
  },
  parameters: {
    docs: {
      description: {
        component:
          '`ChatArea` is the scrollable surface around a conversation: a sticky header, an auto-scrolling message log built from `BaseChatBubble`s, and a footer composer. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.',
      },
    },
  },
} satisfies Meta<typeof BaseChatArea>;

export default meta;
type Story = StoryObj<typeof meta>;

interface Message {
  id: number;
  side: 'start' | 'end';
  author: string;
  time: string;
  text: string;
}

/** A complete chat with header, message log, and a working composer. */
export const Conversation: Story = {
  render: (arguments_) => ({
    components: { BaseChatArea, BaseChatBubble, BaseButton, BaseInput, BaseTypography },
    setup() {
      const messages = ref<Message[]>([
        { id: 1, side: 'start', author: 'Support', time: '09:58', text: 'Morning! How can I help?' },
        { id: 2, side: 'end', author: 'You', time: '09:59', text: 'My export keeps failing.' },
        { id: 3, side: 'start', author: 'Support', time: '10:00', text: 'Thanks — which format are you exporting to?' },
      ]);
      const draft = ref('');
      function send() {
        const text = draft.value.trim();
        if (!text) return;
        messages.value.push({ id: Date.now(), side: 'end', author: 'You', time: 'now', text });
        draft.value = '';
      }
      return { args: arguments_, messages, draft, send };
    },
    template: `
      <div style="height: 26rem; max-width: 32rem;">
        <BaseChatArea v-bind="args">
          <template #header>
            <BaseTypography variant="h6" weight="semibold">Support chat</BaseTypography>
          </template>

          <BaseChatBubble
            v-for="m in messages"
            :key="m.id"
            :side="m.side"
            :variant="m.side === 'end' ? 'primary' : 'default'"
            :author="m.author"
            :timestamp="m.time"
            :avatar-alt="m.author"
          >
            {{ m.text }}
          </BaseChatBubble>

          <template #footer>
            <form style="display: flex; gap: 0.5rem;" @submit.prevent="send">
              <div style="flex: 1;">
                <BaseInput v-model="draft" placeholder="Type a message…" aria-label="Message" />
              </div>
              <BaseButton type="submit" variant="primary">Send</BaseButton>
            </form>
          </template>
        </BaseChatArea>
      </div>
    `,
  }),
};

/** Messages only, without a header or composer. */
export const MessagesOnly: Story = {
  render: (arguments_) => ({
    components: { BaseChatArea, BaseChatBubble },
    setup: () => ({ args: arguments_ }),
    template: `
      <div style="height: 20rem; max-width: 30rem;">
        <BaseChatArea v-bind="args">
          <BaseChatBubble author="Ada" timestamp="10:30" avatar-alt="A">Hello!</BaseChatBubble>
          <BaseChatBubble side="end" variant="primary" author="You" timestamp="10:31" avatar-alt="Y">Hi Ada 👋</BaseChatBubble>
          <BaseChatBubble author="Ada" timestamp="10:32" avatar-alt="A">How's the new component library going?</BaseChatBubble>
        </BaseChatArea>
      </div>
    `,
  }),
};
