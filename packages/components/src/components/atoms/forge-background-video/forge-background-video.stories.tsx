import { h } from '@mission-platform/forge';

import { ForgeBackgroundVideo } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const SAMPLE_VIDEO = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

/**
 * `ForgeBackgroundVideo` is the write-once component of `@mission-platform/components`.
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
  title: 'Atoms/Media/ForgeBackgroundVideo',
  component: ForgeBackgroundVideo,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Cross-framework `ForgeBackgroundVideo` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It renders a decorative, autoplaying, muted, looping full-bleed video with optional overlaid default-slot content and a scrim, and honours `prefers-reduced-motion` via a reactive `matchMedia` query driven by the neutral hooks. Styling comes from the co-located `forge-background-video.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    src: { control: 'text' },
    poster: { control: 'text' },
    fit: { control: 'inline-radio', options: ['cover', 'contain'] },
    overlay: { control: 'boolean' },
    minHeight: { control: 'text' },
  },
  args: {
    src: SAMPLE_VIDEO,
    fit: 'cover',
    overlay: true,
    minHeight: '24rem',
  },
  render: (arguments_) => (
    <ForgeBackgroundVideo {...arguments_}>
      <h2 style={{ margin: 0, fontSize: '2rem' }}>Background video</h2>
      <p style={{ margin: '0.5rem 0 0' }}>Foreground content sits above the looping video.</p>
    </ForgeBackgroundVideo>
  ),
} satisfies Meta<typeof ForgeBackgroundVideo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutOverlay: Story = { args: { overlay: false } };

export const Tall: Story = { args: { minHeight: '36rem' } };
