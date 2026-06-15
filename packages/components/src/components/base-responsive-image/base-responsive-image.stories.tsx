import BaseResponsiveImage from './base-responsive-image.vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

const meta = {
  title: 'Components/Media/ResponsiveImage',
  component: BaseResponsiveImage,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`ResponsiveImage` component — a `<picture>` with art-directed / format-specific sources, native lazy loading, async decoding, a fixed aspect ratio, and `object-fit` control. See the props, emits, and slots tables below for the public API, and the stories on this page for usage examples.',
      },
    },
  },
  argTypes: {
    src: { control: 'text' },
    alt: { control: 'text' },
    loading: { control: 'inline-radio', options: ['lazy', 'eager'] },
    fit: { control: 'select', options: ['cover', 'contain', 'fill', 'none', 'scale-down'] },
    aspectRatio: { control: 'text' },
    rounded: { control: 'boolean' },
  },
  args: {
    src: 'https://picsum.photos/800/450',
    alt: 'A random placeholder photo',
    loading: 'lazy',
    fit: 'cover',
    aspectRatio: '16 / 9',
    rounded: true,
  },
  render: (arguments_) => ({
    components: { BaseResponsiveImage },
    setup() {
      return { args: arguments_ };
    },
    template: `<div style="max-width: 480px;"><BaseResponsiveImage v-bind="args" /></div>`,
  }),
} satisfies Meta<typeof BaseResponsiveImage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Square: Story = { args: { aspectRatio: '1 / 1', src: 'https://picsum.photos/600/600' } };

export const WithArtDirection: Story = {
  args: {
    sources: [
      { srcset: 'https://picsum.photos/1200/500', media: '(min-width: 768px)' },
      { srcset: 'https://picsum.photos/600/600', media: '(max-width: 767px)' },
    ],
  },
};
