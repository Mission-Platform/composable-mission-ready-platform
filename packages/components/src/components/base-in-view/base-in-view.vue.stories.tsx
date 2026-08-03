import { InView } from '@mission-platform/components/vue';

import styles from './base-in-view.module.scss';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `InView` is the Vue 3 build of the write-once `BaseInView`. It is authored
 * **once** in the framework-neutral JSX dialect and uses the neutral hooks
 * (`useState`/`useRef`/`useEffect`) for its `IntersectionObserver` lifecycle;
 * `@mission-platform/vite-plugin-forge` compiles those hooks to the Vue hook shim
 * here (and to React's own hooks for the `./react` build). It reveals its
 * content with the configured animation once it scrolls into view.
 */
const meta = {
  title: 'Components/Layout/BaseInView',
  component: InView,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `InView` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). It demonstrates the neutral hooks driving an `IntersectionObserver`. The demo card styling comes from the co-located `base-in-view.module.scss` CSS Module (consumed here through its hashed class map).',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    animation: {
      control: 'select',
      options: ['fade', 'slide-up', 'slide-left', 'slide-right', 'scale', 'none'],
    },
    threshold: { control: { type: 'number', min: 0, max: 1, step: 0.05 } },
    duration: { control: 'number' },
    delay: { control: 'number' },
    once: { control: 'boolean' },
  },
  args: {
    animation: 'fade',
    threshold: 0.15,
    duration: 500,
    delay: 0,
    once: true,
  },
  render: (arguments_) => ({
    components: { InView },
    setup() {
      return { args: arguments_, styles };
    },
    template: `<InView v-bind="args"><div :class="styles['in-view-demo']">Revealed when in view</div></InView>`,
  }),
} satisfies Meta<typeof InView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Fade: Story = {};

export const SlideUp: Story = { args: { animation: 'slide-up' } };

export const Scale: Story = { args: { animation: 'scale' } };

export const NoAnimation: Story = { args: { animation: 'none' } };
