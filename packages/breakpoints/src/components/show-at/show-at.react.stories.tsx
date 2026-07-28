import { ShowAt } from '@mission-platform/breakpoints/react';

import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * Cross-framework `ShowAt` — authored once in the neutral JSX dialect and
 * shipped to both React (this story, via `@mission-platform/breakpoints/react`)
 * and Vue 3 (`@mission-platform/breakpoints/vue`). It renders its children only
 * when the viewport is at or above `min` and strictly below `max`.
 */
const meta = {
  title: 'Breakpoints/ShowAt',
  component: ShowAt,
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
    <ShowAt {...arguments_}>
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
    </ShowAt>
  ),
} satisfies Meta<typeof ShowAt>;

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
};

export const ShowFromXl: Story = {
  globals: { viewport: { value: 'xl', isRotated: false } },
  args: { min: 'xl' },
};

export const ShowBelowLg: Story = {
  globals: { viewport: { value: 'sm', isRotated: false } },
  args: { max: 'lg' },
};

export const ShowBetweenSmAndXl: Story = {
  globals: { viewport: { value: 'sm', isRotated: false } },
  args: { min: 'sm', max: 'xl' },
};
