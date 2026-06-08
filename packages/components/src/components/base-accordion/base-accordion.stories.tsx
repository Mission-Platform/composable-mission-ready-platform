import { expect, userEvent, within } from 'storybook/test';

import BaseAccordionItem from './base-accordion-item.vue';
import BaseAccordion from './base-accordion.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Display/Accordion',
  component: BaseAccordion,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: [
          '`BaseAccordion` is a vertically stacked container of collapsible `BaseAccordionItem` rows.',
          '',
          'Open state is centralised on the parent via `provide`/`inject`. Use `exclusive` (default `true`)',
          'to enforce a single-open-item behavior, or set it to `false` to allow multiple items open at once.',
          'Children use the `summary` slot for the header and the default slot for the revealed content.',
        ].join('\n'),
      },
    },
  },
  argTypes: {
    exclusive: { control: 'boolean' },
  },
  args: {
    exclusive: true,
  },
  render: (arguments_) => ({
    components: { BaseAccordion, BaseAccordionItem },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <BaseAccordion v-bind="args" style="max-width: 560px;">
        <BaseAccordionItem id="a">
          <template #summary>What is Vue.js?</template>
          Vue.js is a progressive JavaScript framework for building user interfaces.
        </BaseAccordionItem>
        <BaseAccordionItem id="b">
          <template #summary>What is TypeScript?</template>
          TypeScript is a strongly typed programming language that builds on JavaScript.
        </BaseAccordionItem>
        <BaseAccordionItem id="c">
          <template #summary>What is Vite?</template>
          Vite is a next-generation front-end tooling that is fast and lean.
        </BaseAccordionItem>
        <BaseAccordionItem id="d" :disabled="true">
          <template #summary>Disabled item</template>
          You should not see this.
        </BaseAccordionItem>
      </BaseAccordion>
    `,
  }),
} satisfies Meta<typeof BaseAccordion>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Exclusive mode (default) — opening one item closes the others. Verifies that clicking an item reveals its content.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    // Arrange
    const canvas = within(canvasElement);
    const summary = canvas.getByText('What is Vue.js?');

    // Act — expand the first item
    await userEvent.click(summary);

    // Assert — content is now visible
    expect(canvas.getByText(/progressive JavaScript framework/i)).toBeVisible();
  },
};

export const MultiOpen: Story = {
  args: { exclusive: false },
  parameters: {
    docs: {
      description: {
        story: 'Non-exclusive mode — multiple items can be open simultaneously. Use for FAQ-style content.',
      },
    },
  },
};
