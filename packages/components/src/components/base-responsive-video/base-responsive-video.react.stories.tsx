import { ResponsiveVideo } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

const SAMPLE_VIDEO = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

/**
 * `ResponsiveVideo` is the **React** build of the write-once
 * `BaseResponsiveVideo` in `@mission-platform/components`. It renders a `<video>`
 * that scales to its container with a fixed aspect ratio, format-specific
 * sources, a poster, and playback controls; the `play`/`pause`/`ended` emits
 * become the `onPlay`/`onPause`/`onEnded` callback props. Authored once in the
 * neutral JSX dialect and compiled straight to React by
 * `@mission-platform/vite-plugin-jsx`.
 */
const meta = {
  title: 'Components/Media/BaseResponsiveVideo',
  component: ResponsiveVideo,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ResponsiveVideo` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). It renders a `<video>` that scales to its container with a fixed aspect ratio, format-specific sources, a poster, and playback controls. Styling comes from the co-located `base-responsive-video.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    src: { control: 'text' },
    poster: { control: 'text' },
    controls: { control: 'boolean' },
    autoplay: { control: 'boolean' },
    loop: { control: 'boolean' },
    muted: { control: 'boolean' },
    aspectRatio: { control: 'text' },
    fit: { control: 'select', options: ['cover', 'contain', 'fill', 'none', 'scale-down'] },
    rounded: { control: 'boolean' },
  },
  args: {
    src: SAMPLE_VIDEO,
    controls: true,
    autoplay: false,
    loop: false,
    muted: false,
    aspectRatio: '16 / 9',
    fit: 'contain',
    rounded: true,
  },
  render: (arguments_) => (
    <div style={{ maxWidth: 560 }}>
      <ResponsiveVideo {...arguments_} />
    </div>
  ),
} satisfies Meta<typeof ResponsiveVideo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AutoplayMutedLoop: Story = { args: { autoplay: true, muted: true, loop: true, controls: false } };

export const Square: Story = { args: { aspectRatio: '1 / 1', fit: 'cover' } };
