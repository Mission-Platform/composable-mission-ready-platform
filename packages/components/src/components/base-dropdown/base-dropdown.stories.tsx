import { expect, userEvent, waitForElementToBeRemoved, within } from 'storybook/test';
import { ref } from 'vue';

import BaseButton from '../base-button/base-button.vue';

import BaseDropdown from './base-dropdown.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Overlays/Dropdown',
  component: BaseDropdown,
  tags: ['autodocs'],
  argTypes: {
    placement: {
      control: 'select',
      options: ['bottom-start', 'bottom-end', 'bottom', 'top-start', 'top-end', 'top'],
    },
    maxHeight: { control: 'text' },
    matchTriggerWidth: { control: 'boolean' },
    closeOnOutsideClick: { control: 'boolean' },
    open: { control: 'boolean' },
  },
  args: {
    open: false,
    placement: 'bottom-start',
    matchTriggerWidth: true,
    maxHeight: '240px',
    closeOnOutsideClick: true,
  },
} satisfies Meta<typeof BaseDropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

const itemStyle = 'padding: 0.5rem 1rem; cursor: pointer; list-style: none; white-space: nowrap;';
const ulStyle = 'list-style: none; margin: 0; padding: 0;';

export const Default: Story = {
  render: () => ({
    components: { BaseDropdown, BaseButton },
    setup() {
      const open = ref(false);
      return { open };
    },
    template: `
      <BaseDropdown v-model:open="open">
        <template #trigger>
          <BaseButton @click="open = !open">Open dropdown</BaseButton>
        </template>
        <ul style="${ulStyle}">
          <li style="${itemStyle}">Option 1</li>
          <li style="${itemStyle}">Option 2</li>
          <li style="${itemStyle}">Option 3</li>
        </ul>
      </BaseDropdown>
    `,
  }),
  play: async ({ canvasElement }) => {
    // Arrange
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: /open dropdown/i });

    // Act — open
    await userEvent.click(trigger);

    // Assert — dropdown panel is visible
    const panel = canvasElement.querySelector('.base-dropdown');
    expect(panel).toBeInTheDocument();

    // Act — close
    await userEvent.click(trigger);

    // Assert — dropdown panel is removed (wait for CSS transition to complete)
    await waitForElementToBeRemoved(() => canvasElement.querySelector('.base-dropdown'));
  },
};

export const OpenByDefault: Story = {
  render: () => ({
    components: { BaseDropdown, BaseButton },
    setup() {
      const open = ref(true);
      return { open };
    },
    template: `
      <BaseDropdown v-model:open="open">
        <template #trigger>
          <BaseButton @click="open = !open">Toggle dropdown</BaseButton>
        </template>
        <ul style="${ulStyle}">
          <li style="${itemStyle}">Option A</li>
          <li style="${itemStyle}">Option B</li>
          <li style="${itemStyle}">Option C</li>
        </ul>
      </BaseDropdown>
    `,
  }),
  play: async ({ canvasElement }) => {
    // Assert — dropdown panel rendered immediately
    expect(canvasElement.querySelector('.base-dropdown')).toBeInTheDocument();
  },
};

export const PlacementTopStart: Story = {
  render: () => ({
    components: { BaseDropdown, BaseButton },
    setup() {
      const open = ref(true);
      return { open };
    },
    template: `
      <div style="padding-top: 120px;">
        <BaseDropdown v-model:open="open" placement="top-start">
          <template #trigger>
            <BaseButton @click="open = !open">Top-start</BaseButton>
          </template>
          <ul style="${ulStyle}">
            <li style="${itemStyle}">Option 1</li>
            <li style="${itemStyle}">Option 2</li>
            <li style="${itemStyle}">Option 3</li>
          </ul>
        </BaseDropdown>
      </div>
    `,
  }),
};

export const PlacementBottomEnd: Story = {
  render: () => ({
    components: { BaseDropdown, BaseButton },
    setup() {
      const open = ref(true);
      return { open };
    },
    template: `
      <BaseDropdown v-model:open="open" placement="bottom-end">
        <template #trigger>
          <BaseButton @click="open = !open">Bottom-end</BaseButton>
        </template>
        <ul style="${ulStyle}">
          <li style="${itemStyle}">Option 1</li>
          <li style="${itemStyle}">Option 2</li>
          <li style="${itemStyle}">Option 3</li>
        </ul>
      </BaseDropdown>
    `,
  }),
};

export const NoMatchTriggerWidth: Story = {
  render: () => ({
    components: { BaseDropdown, BaseButton },
    setup() {
      const open = ref(true);
      return { open };
    },
    template: `
      <BaseDropdown v-model:open="open" :match-trigger-width="false">
        <template #trigger>
          <BaseButton @click="open = !open">Short</BaseButton>
        </template>
        <ul style="${ulStyle}">
          <li style="${itemStyle}">A much longer option label</li>
          <li style="${itemStyle}">Another long option label</li>
          <li style="${itemStyle}">Short</li>
        </ul>
      </BaseDropdown>
    `,
  }),
};

export const CustomMaxHeight: Story = {
  render: () => ({
    components: { BaseDropdown, BaseButton },
    setup() {
      const open = ref(true);
      const items = Array.from({ length: 12 }, (_, index) => `Option ${index + 1}`);
      return { open, items };
    },
    template: `
      <BaseDropdown v-model:open="open" max-height="120px">
        <template #trigger>
          <BaseButton @click="open = !open">Scrollable dropdown</BaseButton>
        </template>
        <ul style="${ulStyle}">
          <li v-for="item in items" :key="item" style="${itemStyle}">{{ item }}</li>
        </ul>
      </BaseDropdown>
    `,
  }),
  play: async ({ canvasElement }) => {
    // Arrange — dropdown panel is visible
    const panel = canvasElement.querySelector('.base-dropdown') as HTMLElement;

    // Assert — maxHeight is applied as inline style
    expect(panel).toHaveStyle({ maxHeight: '120px' });
  },
};

export const CloseOnOutsideClickDisabled: Story = {
  render: () => ({
    components: { BaseDropdown, BaseButton },
    setup() {
      const open = ref(true);
      return { open };
    },
    template: `
      <div>
        <BaseDropdown v-model:open="open" :close-on-outside-click="false">
          <template #trigger>
            <BaseButton @click="open = !open">Stays open</BaseButton>
          </template>
          <ul style="${ulStyle}">
            <li style="${itemStyle}">Click outside — stays open</li>
            <li style="${itemStyle}">Option 2</li>
          </ul>
        </BaseDropdown>
        <p id="outside" style="margin-top: 8rem; font-size: 0.875rem; color: #4b5563;">Click here — dropdown stays open.</p>
      </div>
    `,
  }),
  play: async ({ canvasElement }) => {
    // Arrange — dropdown is open
    const canvas = within(canvasElement);
    expect(canvasElement.querySelector('.base-dropdown')).toBeInTheDocument();

    // Act — click outside the dropdown
    const outside = canvas.getByText(/click here/i);
    await userEvent.click(outside);

    // Assert — panel is still visible because closeOnOutsideClick=false
    expect(canvasElement.querySelector('.base-dropdown')).toBeInTheDocument();
  },
};
