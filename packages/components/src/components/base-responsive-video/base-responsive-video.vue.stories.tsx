import { ResponsiveVideo } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const SAMPLE_VIDEO = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

/**
 * `ResponsiveVideo` is the Vue 3 build of the write-once `BaseResponsiveVideo`
 * in this package. The component is authored **once** in the framework-neutral
 * JSX dialect (`@mission-platform/forge`) and compiled straight to a Vue component
 * at build time by `@mission-platform/vite-plugin-forge`. The very same source
 * also ships as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Media/BaseResponsiveVideo',
  component: ResponsiveVideo,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ResponsiveVideo` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). It renders a `<video>` that scales to its container with a fixed aspect ratio, format-specific sources, a poster, and playback controls. The original `play`/`pause`/`ended` emits become the `onPlay`/`onPause`/`onEnded` callback props. Styling comes from the co-located `base-responsive-video.module.scss`.',
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
  render: (arguments_) => ({
    components: { ResponsiveVideo },
    setup() {
      return { args: arguments_ };
    },
    template: '<div style="max-width: 560px;"><ResponsiveVideo v-bind="args" /></div>',
  }),
} satisfies Meta<typeof ResponsiveVideo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AutoplayMutedLoop: Story = { args: { autoplay: true, muted: true, loop: true, controls: false } };

export const Square: Story = { args: { aspectRatio: '1 / 1', fit: 'cover' } };
