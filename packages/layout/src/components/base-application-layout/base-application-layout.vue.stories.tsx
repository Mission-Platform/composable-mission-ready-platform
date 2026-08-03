import { ApplicationLayout } from '@mission-platform/layouts/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `ApplicationLayout` is the Vue 3 build of the write-once
 * `BaseApplicationLayout` in this package. The component is authored **once** in
 * the framework-neutral JSX dialect (`@mission-platform/forge`) and compiled
 * straight to a Vue component at build time by
 * `@mission-platform/vite-plugin-forge`. The very same source also ships as a
 * React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Layouts/BaseApplicationLayout',
  component: ApplicationLayout,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Cross-framework `ApplicationLayout` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/layouts/vue`) and React (`@mission-platform/layouts/react`). It stacks a colour-coded status banner, a header (navbar), the scrollable main content, and a footer, each exposed as a named slot (`status`, `navbar`, `content`, `footer`). The styling comes from the co-located `base-application-layout.module.scss`.',
      },
    },
  },
  argTypes: {
    statusLevel: { control: 'inline-radio', options: ['none', 'info', 'warning', 'error'] },
    stickyHeader: { control: 'boolean' },
  },
  args: {
    statusLevel: 'none',
    stickyHeader: false,
  },
  render: (arguments_) => ({
    components: { ApplicationLayout },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <ApplicationLayout v-bind="args" style="min-height: 24rem;">
        <template #status>System status: all services operational</template>
        <template #navbar>
          <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--mp-spacing-3) var(--mp-spacing-4); background: var(--mp-color-bg-surface); border-bottom: 1px solid var(--mp-color-border-default); color: var(--mp-color-text-primary);">
            <strong>Mission Platform</strong>
            <span>Menu</span>
          </div>
        </template>
        <template #content>
          <div style="padding: var(--mp-spacing-6); color: var(--mp-color-text-primary);">
            <h1 style="margin-top: 0;">Page content</h1>
            <p>The main content region grows to fill the available space and scrolls independently.</p>
          </div>
        </template>
        <template #footer>
          <div style="padding: var(--mp-spacing-4); background: var(--mp-color-bg-surface); border-top: 1px solid var(--mp-color-border-default); color: var(--mp-color-text-secondary);">
            © Mission Platform
          </div>
        </template>
      </ApplicationLayout>
    `,
  }),
} satisfies Meta<typeof ApplicationLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const InfoStatus: Story = { args: { statusLevel: 'info' } };

export const WarningStatus: Story = { args: { statusLevel: 'warning' } };

export const ErrorStatus: Story = {
  args: { statusLevel: 'error' },
  render: (arguments_) => ({
    components: { ApplicationLayout },
    setup() {
      return { args: arguments_ };
    },
    template: `
      <ApplicationLayout v-bind="args" style="min-height: 24rem;">
        <template #status>We're experiencing a service disruption</template>
        <template #content>
          <div style="padding: var(--mp-spacing-6); color: var(--mp-color-text-primary);">
            <p>The status banner uses <code>role="alert"</code> for the error level.</p>
          </div>
        </template>
      </ApplicationLayout>
    `,
  }),
};

export const StickyHeader: Story = { args: { stickyHeader: true, statusLevel: 'info' } };
