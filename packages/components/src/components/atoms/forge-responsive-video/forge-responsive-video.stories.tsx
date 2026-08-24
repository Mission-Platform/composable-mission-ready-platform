
import { ForgeResponsiveVideo } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const SAMPLE_VIDEO = '/favicon.svg';

/**
 * `ForgeResponsiveVideo` is the write-once `ForgeResponsiveVideo` component of
 * `@mission-platform/components`. It renders a `<video>` that scales to its
 * container with a fixed aspect ratio, format-specific sources, a poster, and
 * playback controls; the `play`/`pause`/`ended` emits become the
 * `onPlay`/`onPause`/`onEnded` callback props. This single neutral story renders
 * on the framework selected by `STORYBOOK_FRAMEWORK`.
 */

const meta = {
  title: 'Atoms/Media/ForgeResponsiveVideo',
  component: ForgeResponsiveVideo,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeResponsiveVideo` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It renders a `<video>` that scales to its container with a fixed aspect ratio, format-specific sources, a poster, and playback controls. Styling comes from the co-located `forge-responsive-video.module.scss`.',
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
      <ForgeResponsiveVideo {...arguments_} />
    </div>
  ),
} satisfies Meta<typeof ForgeResponsiveVideo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AutoplayMutedLoop: Story = { args: { autoplay: true, muted: true, loop: true, controls: false } };

export const Square: Story = { args: { aspectRatio: '1 / 1', fit: 'cover' } };
