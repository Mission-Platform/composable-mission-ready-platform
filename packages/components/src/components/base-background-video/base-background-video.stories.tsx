import BaseBackgroundVideo from './base-background-video.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const SAMPLE_VIDEO = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

const meta = {
  title: 'Components/Media/BaseBackgroundVideo',
  component: BaseBackgroundVideo,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          '`BackgroundVideo` component — a decorative, autoplaying, muted, looping full-bleed video with optional overlaid content and a scrim. Honours `prefers-reduced-motion`. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.',
      },
    },
  },
  argTypes: {
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
    components: { BaseBackgroundVideo },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <BaseBackgroundVideo v-bind="args">
        <h2 style="margin: 0; font-size: 2rem;">Background video</h2>
        <p style="margin: 0.5rem 0 0;">Foreground content sits above the looping video.</p>
      </BaseBackgroundVideo>
    `,
  }),
} satisfies Meta<typeof BaseBackgroundVideo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutOverlay: Story = { args: { overlay: false } };

export const Tall: Story = { args: { minHeight: '36rem' } };
