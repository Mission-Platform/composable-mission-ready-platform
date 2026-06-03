import ShowAt from './ShowAt.vue'

import type { Meta, StoryObj } from '@storybook/vue3-vite'

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
  render: (arguments_) => ({
    components: { ShowAt },
    setup() {
      return { args: arguments_ }
    },
    template: `
      <ShowAt v-bind="args">
        <div style="padding: var(--mp-spacing-4); background: var(--mp-color-info-subtle); border-radius: var(--mp-radius-md); font-family: var(--mp-font-family-mono); color: var(--mp-color-info-default);">
          ✓ Slot content is visible at this viewport width
        </div>
      </ShowAt>
    `,
  }),
} satisfies Meta<typeof ShowAt>

export default meta
type Story = StoryObj<typeof meta>

export const AlwaysVisible: Story = {
  parameters: { viewport: { defaultViewport: 'md' } },
  args: {},
}

export const ShowFromMd: Story = {
  parameters: { viewport: { defaultViewport: 'md' } },
  args: { min: 'md' },
}

export const ShowFromMdOnMobile: Story = {
  name: 'ShowFrom md — hidden on mobile (2xs)',
  parameters: { viewport: { defaultViewport: '2xs' } },
  args: { min: 'md' },
}

export const ShowFromLg: Story = {
  parameters: { viewport: { defaultViewport: 'lg' } },
  args: { min: 'lg' },
}

export const ShowFromXl: Story = {
  parameters: { viewport: { defaultViewport: 'xl' } },
  args: { min: 'xl' },
}

export const ShowBelowLg: Story = {
  parameters: { viewport: { defaultViewport: 'sm' } },
  args: { max: 'lg' },
}

export const ShowBetweenSmAndXl: Story = {
  parameters: { viewport: { defaultViewport: 'sm' } },
  args: { min: 'sm', max: 'xl' },
}
