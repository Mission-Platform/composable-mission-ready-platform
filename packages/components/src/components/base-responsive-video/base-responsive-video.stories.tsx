import BaseResponsiveVideo from './base-responsive-video.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const SAMPLE_VIDEO = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

const meta = {
  title: 'Components/Media/ResponsiveVideo',
  component: BaseResponsiveVideo,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`ResponsiveVideo` component — a `<video>` that scales to its container with a fixed aspect ratio, format-specific sources, a poster, and playback controls. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.',
      },
    },
  },
  argTypes: {
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
    components: { BaseResponsiveVideo },
    setup() {
      return { args: arguments_ };
    },
    template: `<div style="max-width: 560px;"><BaseResponsiveVideo v-bind="args" /></div>`,
  }),
} satisfies Meta<typeof BaseResponsiveVideo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AutoplayMutedLoop: Story = { args: { autoplay: true, muted: true, loop: true, controls: false } };

export const Square: Story = { args: { aspectRatio: '1 / 1', fit: 'cover' } };
