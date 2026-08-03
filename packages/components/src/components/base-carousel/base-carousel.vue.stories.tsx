import { ref } from 'vue';

import { Carousel } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `Carousel` is the Vue 3 build of the write-once `BaseCarousel` in this
 * package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/forge`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-forge`. The very same source also
 * ships as a React component via the package's `./react` subpath.
 */
const SLIDES = [
  { id: 'a', content: 'Slide A', image: 'https://picsum.photos/seed/mp-a/640/280' },
  { id: 'b', content: 'Slide B', image: 'https://picsum.photos/seed/mp-b/640/280' },
  { id: 'c', content: 'Slide C', image: 'https://picsum.photos/seed/mp-c/640/280' },
  { id: 'd', content: 'Slide D', image: 'https://picsum.photos/seed/mp-d/640/280' },
];

const meta = {
  title: 'Components/Display/BaseCarousel',
  component: Carousel,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Carousel` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). The original SFC derived its slide count by introspecting slot VNodes, which the neutral dialect cannot do, so slides are driven by a `slides` array (with an optional scoped `slide` slot). Autoplay/keyboard/swipe are reproduced with `useState` + a `useEffect` interval; the `useReducedMotion` composable becomes an inline `matchMedia` check. The active index is controlled via `modelValue` and the original `v-model` + `change` emit become the `onUpdateModelValue`/`onChange` callback props. Styling comes from the co-located `base-carousel.module.scss`.',
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
  render: (arguments_) => ({
    components: { Carousel },
    setup() {
      const value = ref(arguments_.modelValue ?? 0);
      return { args: arguments_, value };
    },
    template:
      '<div style="max-width: 640px;"><Carousel v-bind="args" :model-value="value" @update-model-value="value = $event" /></div>',
  }),
} satisfies Meta<typeof Carousel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoControls: Story = { args: { controls: false } };

export const NoLoop: Story = { args: { loop: false } };

export const Autoplay: Story = { args: { autoplay: true, interval: 2500 } };
