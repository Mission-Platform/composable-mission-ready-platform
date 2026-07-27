import { useState } from 'react';

import { Carousel } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

const SLIDES = [
  { id: 'a', content: 'Slide A', image: 'https://picsum.photos/seed/mp-a/640/280' },
  { id: 'b', content: 'Slide B', image: 'https://picsum.photos/seed/mp-b/640/280' },
  { id: 'c', content: 'Slide C', image: 'https://picsum.photos/seed/mp-c/640/280' },
  { id: 'd', content: 'Slide D', image: 'https://picsum.photos/seed/mp-d/640/280' },
];

/**
 * `Carousel` is the **React** build of the write-once `BaseCarousel` in
 * `@mission-platform/components`. Slides are driven by a `slides` array (with an
 * optional scoped `slide` slot). Autoplay/keyboard/swipe use `useState` + a
 * `useEffect` interval; the active index is controlled via `modelValue` and the
 * `v-model` + `change` emit become the `onUpdateModelValue`/`onChange` callback
 * props. Authored once in the neutral JSX dialect and compiled straight to React
 * by `@mission-platform/vite-plugin-jsx`.
 */
const meta = {
  title: 'Components/Display/BaseCarousel',
  component: Carousel,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Carousel` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). Slides are driven by a `slides` array; autoplay/keyboard/swipe use `useState` + a `useEffect` interval and the active index is controlled via `modelValue`. Styling comes from the co-located `base-carousel.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    controls: { control: 'boolean' },
    indicators: { control: 'boolean' },
    loop: { control: 'boolean' },
    autoplay: { control: 'boolean' },
    pauseOnHover: { control: 'boolean' },
    interval: { control: 'number' },
    variant: {
      control: 'select',
      options: ['neutral', 'primary', 'secondary', 'tertiary', 'success', 'warning', 'info', 'error', 'critical'],
    },
  },
  args: {
    slides: SLIDES,
    controls: true,
    indicators: true,
    loop: true,
    autoplay: false,
    pauseOnHover: true,
    interval: 5000,
    ariaLabel: 'Featured items',
  },
  render: (arguments_) => {
    const [value, setValue] = useState(arguments_.modelValue ?? 0);
    return (
      <div style={{ maxWidth: 640 }}>
        <Carousel
          {...arguments_}
          modelValue={value}
          onUpdateModelValue={setValue}
        />
      </div>
    );
  },
} satisfies Meta<typeof Carousel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoControls: Story = { args: { controls: false } };

export const NoLoop: Story = { args: { loop: false } };

export const Autoplay: Story = { args: { autoplay: true, interval: 2500 } };
