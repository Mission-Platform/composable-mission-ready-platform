import { BackgroundVideo } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

const SAMPLE_VIDEO = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

/**
 * `BackgroundVideo` is the **React** build of the write-once
 * `BaseBackgroundVideo` in `@mission-platform/components` — a decorative,
 * autoplaying, muted, looping full-bleed video with optional overlaid content
 * and a scrim. Authored once in the neutral JSX dialect and compiled straight to
 * React by `@mission-platform/vite-plugin-forge`.
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
          'Cross-framework `BackgroundVideo` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). It renders a decorative, autoplaying, muted, looping full-bleed video with optional overlaid content and a scrim, and honours `prefers-reduced-motion`. Styling comes from the co-located `base-background-video.module.scss`.',
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
    <BackgroundVideo {...arguments_}>
      <h2 style={{ margin: 0, fontSize: '2rem' }}>Background video</h2>
      <p style={{ margin: '0.5rem 0 0' }}>Foreground content sits above the looping video.</p>
    </BackgroundVideo>
  ),
} satisfies Meta<typeof BackgroundVideo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutOverlay: Story = { args: { overlay: false } };

export const Tall: Story = { args: { minHeight: '36rem' } };
