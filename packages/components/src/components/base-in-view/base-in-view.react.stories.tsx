import { InView } from '@mission-platform/components/react';

import styles from './base-in-view.module.scss';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `InView` is the **React** build of the write-once `BaseInView`. It uses the
 * neutral hooks (`useState`/`useRef`/`useEffect`) for its `IntersectionObserver`
 * lifecycle — compiled straight to React's own hooks by
 * `@mission-platform/vite-plugin-jsx` — revealing its content with the configured
 * animation once it scrolls into view.
 */
const meta = {
  title: 'Components/Layout/BaseInView',
  component: InView,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `InView` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). It demonstrates the neutral hooks driving an `IntersectionObserver`. The demo card styling comes from the co-located `base-in-view.module.scss` CSS Module.',
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
  render: (arguments_) => (
    <InView {...arguments_}>
      <div className={styles['in-view-demo']}>Revealed when in view</div>
    </InView>
  ),
} satisfies Meta<typeof InView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Fade: Story = {};

export const SlideUp: Story = { args: { animation: 'slide-up' } };

export const Scale: Story = { args: { animation: 'scale' } };

export const NoAnimation: Story = { args: { animation: 'none' } };
