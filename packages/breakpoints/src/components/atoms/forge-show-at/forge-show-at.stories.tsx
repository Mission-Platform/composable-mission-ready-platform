import { h } from '@mission-platform/forge';
import { expect, waitFor } from 'storybook/test';

import { ForgeShowAt } from '@mission-platform/breakpoints';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * Cross-framework `ForgeShowAt` — authored once in the neutral JSX dialect and
 * shipped to all supported frameworks. It renders its children only when the
 * viewport is at or above `min` and strictly below `max`.
 */
const meta = {
  title: 'Atoms/Layout/ForgeShowAt',
  component: ForgeShowAt,
  tags: ['autodocs'],
  argTypes: {
    min: {
      control: 'select',
      options: [undefined, '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'],
      description: 'Show slot content when the viewport is at or above this breakpoint.',
    },
    max: {
      control: 'select',
      options: [undefined, '2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'],
      description: 'Show slot content when the viewport is strictly below this breakpoint.',
    },
  },
  render: (arguments_) => (
    <ForgeShowAt {...arguments_}>
      <div
        style={{
          padding: 'var(--mp-spacing-4)',
          background: 'var(--mp-color-info-subtle)',
          borderRadius: 'var(--mp-radius-md)',
          fontFamily: 'var(--mp-font-family-mono)',
          color: 'var(--mp-color-info-default)',
        }}
      >
        ✓ Slot content is visible at this viewport width
      </div>
    </ForgeShowAt>
  ),
} satisfies Meta<typeof ForgeShowAt>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AlwaysVisible: Story = {
  globals: { viewport: { value: 'md', isRotated: false } },
  args: {},
};

export const ShowFromMd: Story = {
  globals: { viewport: { value: 'md', isRotated: false } },
  args: { min: 'md' },
};

export const ShowFromMdOnMobile: Story = {
  name: 'ShowFrom md — hidden on mobile (2xs)',
  globals: { viewport: { value: '2xs', isRotated: false } },
  args: { min: 'md' },
};

export const ShowFromLg: Story = {
  globals: { viewport: { value: 'lg', isRotated: false } },
  args: { min: 'lg' },
  play: async ({ canvasElement }) => {
    Object.defineProperty(globalThis, 'innerWidth', { configurable: true, value: 1920 });
    globalThis.dispatchEvent(new Event('resize'));
    await waitFor(() => expect(canvasElement.textContent).toContain('Slot content is visible'));
  },
};

export const ShowFromXl: Story = {
  globals: { viewport: { value: 'xl', isRotated: false } },
  args: { min: 'xl' },
  play: async ({ canvasElement }) => {
    Object.defineProperty(globalThis, 'innerWidth', { configurable: true, value: 2560 });
    globalThis.dispatchEvent(new Event('resize'));
    await waitFor(() => expect(canvasElement.textContent).toContain('Slot content is visible'));
  },
};

export const ShowBelowLg: Story = {
  globals: { viewport: { value: 'sm', isRotated: false } },
  args: { max: 'lg' },
};

export const ShowBetweenSmAndXl: Story = {
  globals: { viewport: { value: 'sm', isRotated: false } },
  args: { min: 'sm', max: 'xl' },
};
