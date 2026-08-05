import { h } from '@mission-platform/forge';
import { useArgs } from 'storybook/preview-api';

import { ForgeCarousel } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const SLIDES = [
  { id: 'a', content: 'Slide A', image: 'https://picsum.photos/seed/mp-a/640/280' },
  { id: 'b', content: 'Slide B', image: 'https://picsum.photos/seed/mp-b/640/280' },
  { id: 'c', content: 'Slide C', image: 'https://picsum.photos/seed/mp-c/640/280' },
  { id: 'd', content: 'Slide D', image: 'https://picsum.photos/seed/mp-d/640/280' },
];

/**
 * `ForgeCarousel` is the write-once component of `@mission-platform/components`.
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
  title: 'Organisms/Display/ForgeCarousel',
  component: ForgeCarousel,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeCarousel` — authored once in the neutral JSX dialect and shipped to all supported frameworks. The original SFC derived its slide count by introspecting slot VNodes, which the neutral dialect cannot do, so slides are driven by a `slides` array (with an optional scoped `slide` slot). Autoplay/keyboard/swipe are reproduced with `useState` + a `useEffect` interval; the `useReducedMotion` composable becomes an inline `matchMedia` check. The active index is controlled via `modelValue` and the original `v-model` + `change` emit become the `onUpdateModelValue`/`onChange` callback props. Styling comes from the co-located `forge-carousel.module.scss`.',
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
    const [{ modelValue }, updateArguments] = useArgs();
    return (
      <div style={{ maxWidth: '640px' }}>
        <ForgeCarousel
          {...arguments_}
          modelValue={modelValue ?? 0}
          onUpdateModelValue={(value) => updateArguments({ modelValue: value })}
        />
      </div>
    );
  },
} satisfies Meta<typeof ForgeCarousel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoControls: Story = { args: { controls: false } };

export const NoLoop: Story = { args: { loop: false } };

export const Autoplay: Story = { args: { autoplay: true, interval: 2500 } };
