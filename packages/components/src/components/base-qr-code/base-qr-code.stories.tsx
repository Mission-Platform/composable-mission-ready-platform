import { QrCode } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `QrCode` is the Vue 3 build of the write-once `BaseQrCode` in this package.
 * The component is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/jsx`) and compiled straight to a Vue component at build
 * time by `@mission-platform/vite-plugin-jsx`. The very same source also ships
 * as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Data Display/BaseQrCode',
  component: QrCode,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `QrCode` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). The payload is encoded entirely on the client by the bundled, dependency-free `qr-encode.ts` (which ships with this package) and drawn as a crisp SVG. The original `computed` render becomes the neutral `useMemo`, and the `error` emit becomes the `onError` callback prop. Styling comes from the co-located `base-qr-code.module.scss`.',
      },
    },
  },
  argTypes: {
    errorCorrection: { control: 'select', options: ['L', 'M', 'Q', 'H'] },
    size: { control: { type: 'number', min: 80, max: 480, step: 8 } },
    margin: { control: { type: 'number', min: 0, max: 8, step: 1 } },
    color: { control: 'color' },
    background: { control: 'color' },
  },
  args: {
    value: 'https://mission-platform.dev',
    errorCorrection: 'M',
    size: 200,
    margin: 4,
    color: '#000000',
    background: '#ffffff',
    ariaLabel: 'Link to mission-platform.dev',
  },
} satisfies Meta<typeof QrCode>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const HighErrorCorrection: Story = { args: { errorCorrection: 'H' } };

export const Coloured: Story = { args: { color: '#1d4ed8', background: '#eff6ff' } };

export const NoQuietZone: Story = { args: { margin: 0 } };

export const LongPayload: Story = {
  args: { value: 'The quick brown fox jumps over the lazy dog. '.repeat(6) },
};
