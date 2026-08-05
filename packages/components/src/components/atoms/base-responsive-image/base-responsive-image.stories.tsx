import { h } from '@mission-platform/forge';

import { ResponsiveImage } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ResponsiveImage` is the write-once `BaseResponsiveImage` component of
 * `@mission-platform/components`. It renders a `<picture>` with art-directed /
 * format-specific sources, native lazy loading, async decoding, a fixed aspect
 * ratio, and `object-fit` control; the `load`/`error` emits become the
 * `onLoad`/`onError` callback props. This single neutral story renders on the
 * framework selected by `STORYBOOK_FRAMEWORK`.
 */

const meta = {
  title: 'Atoms/Media/BaseResponsiveImage',
  component: ResponsiveImage,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ResponsiveImage` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It renders a `<picture>` with art-directed / format-specific sources, native lazy loading, async decoding, a fixed aspect ratio, and `object-fit` control. Styling comes from the co-located `base-responsive-image.module.scss`.',
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
