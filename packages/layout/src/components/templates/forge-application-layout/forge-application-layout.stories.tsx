import { h } from '@mission-platform/forge';

import { ForgeApplicationLayout } from '@mission-platform/layouts';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeApplicationLayout` stacks a colour-coded status banner, a header (navbar),
 * the scrollable main content, and a footer, each exposed as a named slot
 * (`status`, `navbar`, `content`, `footer`).
 */
const meta = {
  title: 'Templates/Layout/ForgeApplicationLayout',
  component: ForgeApplicationLayout,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Cross-framework `ForgeApplicationLayout` — authored once in the neutral JSX dialect and shipped to both Vue 3 and React. It stacks a colour-coded status banner, a header (navbar), the scrollable main content, and a footer, each exposed as a named slot (`status`, `navbar`, `content`, `footer`). The styling comes from the co-located `forge-application-layout.module.scss`.',
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
  render: (arguments_) => (
    <ForgeApplicationLayout
      {...arguments_}
      style={{ minHeight: '24rem' }}
      status="System status: all services operational"
      navbar={
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--mp-spacing-3) var(--mp-spacing-4)',
            background: 'var(--mp-color-bg-surface)',
            borderBottom: '1px solid var(--mp-color-border-default)',
            color: 'var(--mp-color-text-primary)',
          }}
        >
          <strong>Mission Platform</strong>
          <span>Menu</span>
        </div>
      }
      content={
        <div style={{ padding: 'var(--mp-spacing-6)', color: 'var(--mp-color-text-primary)' }}>
          <h1 style={{ marginTop: 0 }}>Page content</h1>
          <p>The main content region grows to fill the available space and scrolls independently.</p>
        </div>
      }
      footer={
        <div
          style={{
            padding: 'var(--mp-spacing-4)',
            background: 'var(--mp-color-bg-surface)',
            borderTop: '1px solid var(--mp-color-border-default)',
            color: 'var(--mp-color-text-secondary)',
          }}
        >
          © Mission Platform
        </div>
      }
    />
  ),
} satisfies Meta<typeof ForgeApplicationLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const InfoStatus: Story = { args: { statusLevel: 'info' } };

export const WarningStatus: Story = { args: { statusLevel: 'warning' } };

export const ErrorStatus: Story = {
  args: { statusLevel: 'error' },
  render: (arguments_) => (
    <ForgeApplicationLayout
      {...arguments_}
      style={{ minHeight: '24rem' }}
      status="We're experiencing a service disruption"
      content={
        <div style={{ padding: 'var(--mp-spacing-6)', color: 'var(--mp-color-text-primary)' }}>
          <p>
            The status banner uses <code>role="alert"</code> for the error level.
          </p>
        </div>
      }
    />
  ),
};

export const StickyHeader: Story = { args: { stickyHeader: true, statusLevel: 'info' } };

/**
 * The optional `startSidebar` and `endSidebar` slots flank the main content with
 * sticky sidebar columns. Each is only rendered when its slot is filled, so
 * a layout can carry a leading navigation rail, a trailing utility panel, or
 * both. Their width is themeable via `--mp-application-layout-sidebar-width`.
 */
export const WithSidebars: Story = {
  render: (arguments_) => (
    <ForgeApplicationLayout
      {...arguments_}
      style={{ minHeight: '24rem' }}
      navbar={
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: 'var(--mp-spacing-3) var(--mp-spacing-4)',
            background: 'var(--mp-color-bg-surface)',
            borderBottom: '1px solid var(--mp-color-border-default)',
            color: 'var(--mp-color-text-primary)',
          }}
        >
          <strong>Mission Platform</strong>
        </div>
      }
      startSidebar={
        <nav style={{ padding: 'var(--mp-spacing-4)', color: 'var(--mp-color-text-secondary)' }}>
          <p style={{ marginTop: 0, fontWeight: 700 }}>Navigation</p>
          <p>Overview</p>
          <p>Getting started</p>
          <p>Components</p>
        </nav>
      }
      content={
        <div style={{ padding: 'var(--mp-spacing-6)', color: 'var(--mp-color-text-primary)' }}>
          <h1 style={{ marginTop: 0 }}>Page content</h1>
          <p>The content region sits between the sticky start and end sidebars.</p>
        </div>
      }
      endSidebar={
        <aside style={{ padding: 'var(--mp-spacing-4)', color: 'var(--mp-color-text-secondary)' }}>
          <p style={{ marginTop: 0, fontWeight: 700 }}>On this page</p>
          <p>Introduction</p>
          <p>Usage</p>
        </aside>
      }
    />
  ),
};
