import { BackgroundVideo } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const SAMPLE_VIDEO = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

/**
 * `BackgroundVideo` is the Vue 3 build of the write-once `BaseBackgroundVideo`
 * in this package. The component is authored **once** in the framework-neutral
 * JSX dialect (`@mission-platform/forge`) and compiled straight to a Vue component
 * at build time by `@mission-platform/vite-plugin-forge`. The very same source
 * also ships as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Media/BaseBackgroundVideo',
  component: BackgroundVideo,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Cross-framework `BackgroundVideo` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). It renders a decorative, autoplaying, muted, looping full-bleed video with optional overlaid default-slot content and a scrim, and honours `prefers-reduced-motion` via a reactive `matchMedia` query driven by the neutral hooks. Styling comes from the co-located `base-background-video.module.scss`.',
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
  render: (arguments_) => ({
    components: { BackgroundVideo },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <BackgroundVideo v-bind="args">
        <h2 style="margin: 0; font-size: 2rem;">Background video</h2>
        <p style="margin: 0.5rem 0 0;">Foreground content sits above the looping video.</p>
      </BackgroundVideo>
    `,
  }),
} satisfies Meta<typeof BackgroundVideo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutOverlay: Story = { args: { overlay: false } };

export const Tall: Story = { args: { minHeight: '36rem' } };
