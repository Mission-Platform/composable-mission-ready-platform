import { expect, userEvent, within } from 'storybook/test';

import BaseAccordion from './base-accordion.vue';
import BaseAccordionItem from './base-accordion-item.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Display/Accordion',
  component: BaseAccordion,
  tags: ['autodocs'],
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

export const MultiOpen: Story = { args: { exclusive: false } };
