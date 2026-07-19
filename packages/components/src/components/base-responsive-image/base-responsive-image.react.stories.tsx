import { ResponsiveImage } from '@mission-platform/components/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * `ResponsiveImage` is the **React** build of the write-once
 * `BaseResponsiveImage` in `@mission-platform/components`. It renders a
 * `<picture>` with art-directed / format-specific sources, native lazy loading,
 * async decoding, a fixed aspect ratio, and `object-fit` control; the
 * `load`/`error` emits become the `onLoad`/`onError` callback props. Authored
 * once in the neutral JSX dialect and compiled straight to React by
 * `@mission-platform/vite-plugin-jsx`.
 */
const meta = {
  title: 'Components/Media/BaseResponsiveImage',
  component: ResponsiveImage,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ResponsiveImage` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). It renders a `<picture>` with art-directed / format-specific sources, native lazy loading, async decoding, a fixed aspect ratio, and `object-fit` control. Styling comes from the co-located `base-responsive-image.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
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
  render: (arguments_) => (
    <div style={{ maxWidth: 480 }}>
      <ResponsiveImage {...arguments_} />
    </div>
  ),
} satisfies Meta<typeof ResponsiveImage>;

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
