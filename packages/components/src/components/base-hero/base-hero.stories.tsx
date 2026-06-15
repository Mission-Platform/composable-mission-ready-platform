import BaseButton from '../base-button/base-button.vue';

import BaseHero from './base-hero.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Layout/Hero',
  component: BaseHero,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          '`Hero` component — a prominent page banner with eyebrow, title, subtitle, body, actions, and an optional full-bleed `media` background. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.',
      },
    },
  },
  argTypes: {
    eyebrow: { control: 'text' },
    title: { control: 'text' },
    subtitle: { control: 'text' },
    align: { control: 'inline-radio', options: ['start', 'center', 'end'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    fullHeight: { control: 'boolean' },
    overlay: { control: 'boolean' },
  },
  args: {
    eyebrow: 'Mission Platform',
    title: 'Build composable experiences',
    subtitle: 'A Vue 3 component library assembled from independent, versioned building blocks.',
    align: 'start',
    size: 'md',
    fullHeight: false,
    overlay: false,
  },
  render: (arguments_) => ({
    components: { BaseHero, BaseButton },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <BaseHero v-bind="args">
        <template #actions>
          <BaseButton variant="primary">Get started</BaseButton>
          <BaseButton variant="secondary">Learn more</BaseButton>
        </template>
      </BaseHero>
    `,
  }),
} satisfies Meta<typeof BaseHero>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Centered: Story = { args: { align: 'center' } };

export const Large: Story = { args: { size: 'lg' } };

export const WithBackgroundImage: Story = {
  args: { overlay: true, align: 'center' },
  render: (arguments_) => ({
    components: { BaseHero, BaseButton },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <BaseHero v-bind="args">
        <template #media>
          <img src="https://picsum.photos/1600/900" alt="" />
        </template>
        <template #actions>
          <BaseButton variant="primary">Get started</BaseButton>
        </template>
      </BaseHero>
    `,
  }),
};
