import { ref, watch } from 'vue';

import BaseCard from '../base-card/base-card.vue';

import BaseCarousel from './base-carousel.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Display/BaseCarousel',
  component: BaseCarousel,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`Carousel` component. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.',
      },
    },
  },
  argTypes: {
    modelValue: { control: { type: 'number', min: 0 } },
    controls: { control: 'boolean' },
    indicators: { control: 'boolean' },
    loop: { control: 'boolean' },
    ariaLabel: { control: 'text' },
    autoplay: { control: 'boolean' },
    interval: { control: { type: 'number', min: 1000, step: 500 } },
    pauseOnHover: { control: 'boolean' },
    swipeThreshold: { control: { type: 'number', min: 0, step: 5 } },
  },
  args: {
    modelValue: 0,
    controls: true,
    indicators: true,
    loop: true,
    ariaLabel: 'Example carousel',
    autoplay: false,
    interval: 3000,
    pauseOnHover: true,
    swipeThreshold: 40,
  },
  render: (arguments_) => ({
    components: { BaseCarousel, BaseCard },
    setup() {
      const current = ref(arguments_.modelValue ?? 0);
      // Keep the local model in sync when Storybook controls change.
      watch(
        () => arguments_.modelValue,
        (value) => {
          if (typeof value === 'number' && value !== current.value) {
            current.value = value;
          }
        },
      );
      return { args: arguments_, current };
    },
    template: `
      <div style="max-width: 480px">
        <BaseCarousel v-bind="args" v-model="current">
          <BaseCard class="story-carousel-slide"><strong>Slide 1</strong> — first card</BaseCard>
          <BaseCard class="story-carousel-slide"><strong>Slide 2</strong> — second card</BaseCard>
          <BaseCard class="story-carousel-slide"><strong>Slide 3</strong> — third card</BaseCard>
        </BaseCarousel>
        <p style="margin-top: 12px; font-family: system-ui, sans-serif; font-size: 14px;">
          Current slide (v-model): <strong>{{ current }}</strong>
        </p>
      </div>
      <style>
        .story-carousel-slide {
          min-height: 320px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      </style>
    `,
  }),
} satisfies Meta<typeof BaseCarousel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: { viewport: { defaultViewport: 'md' } },
};

export const Mobile: Story = {
  name: 'Mobile (2xs)',
  parameters: { viewport: { defaultViewport: '2xs' } },
};

export const NoIndicators: Story = {
  parameters: { viewport: { defaultViewport: 'md' } },
  args: { indicators: false },
};

export const NoControls: Story = {
  parameters: { viewport: { defaultViewport: 'md' } },
  args: { controls: false },
};

export const NoLoop: Story = {
  parameters: { viewport: { defaultViewport: 'md' } },
  args: { loop: false },
};

export const Autoplay: Story = {
  parameters: { viewport: { defaultViewport: 'md' } },
  args: { autoplay: true, interval: 2500, pauseOnHover: true },
};
