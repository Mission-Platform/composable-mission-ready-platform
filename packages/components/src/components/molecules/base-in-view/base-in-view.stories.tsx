import { h } from '@mission-platform/forge';

import { InView } from '@mission-platform/components';

import styles from './base-in-view.module.scss';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `InView` is the write-once component of `@mission-platform/components`.
 * It is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/forge`) and compiled at build time by
 * `@mission-platform/vite-plugin-forge` to every supported framework (Vue 3,
 * React, SolidJS, Svelte, and Web Components).
 *
 * This is a single, framework-agnostic story: the bare
 * `@mission-platform/components` import auto-resolves to the framework selected
 * by the `STORYBOOK_FRAMEWORK` env var, and the JSX in `render` is compiled by
 * that framework's own transform — so the same story renders on every framework.
 */
const meta = {
  title: 'Molecules/Layout/BaseInView',
  component: InView,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `InView` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It demonstrates the neutral hooks driving an `IntersectionObserver`. The demo card styling comes from the co-located `base-in-view.module.scss` CSS Module (consumed here through its hashed class map).',
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
      <div class={styles['in-view-demo']}>Revealed when in view</div>
    </InView>
  ),
} satisfies Meta<typeof InView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Fade: Story = {};

export const SlideUp: Story = { args: { animation: 'slide-up' } };

export const Scale: Story = { args: { animation: 'scale' } };

export const NoAnimation: Story = { args: { animation: 'none' } };
