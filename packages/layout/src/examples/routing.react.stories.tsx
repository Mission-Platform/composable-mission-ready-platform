import { ApplicationLayout, Container } from '@mission-platform/layouts/react';

import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * **Routing** — example navigation-shell layouts assembled from the
 * `@mission-platform/layouts` primitives (React build).
 *
 * These show the chrome a routed app hangs around its router outlet: a top nav
 * inside the {@link ApplicationLayout}, a breadcrumb trail and/or a tab strip
 * for sub-routes inside a {@link Container}, and a content region standing in
 * for the router outlet. Presentational only.
 */
const meta = {
  title: 'Layouts/Examples/Routing',
  component: ApplicationLayout,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Navigation-shell layouts built from `@mission-platform/layouts`: an `ApplicationLayout` top nav over a `Container` that carries a breadcrumb trail and a tab strip for sub-routes, plus a content region standing in for the router outlet. Presentational only — bind the links/tabs to `@mission-platform/router` in a real app.',
      },
    },
  },
} satisfies Meta<typeof ApplicationLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

const NAVBAR: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--mp-spacing-5)',
  padding: 'var(--mp-spacing-3) var(--mp-spacing-5)',
  background: 'var(--mp-color-bg-surface)',
  borderBottom: '1px solid var(--mp-color-border-default)',
  color: 'var(--mp-color-text-primary)',
};
const NAV_LINK: CSSProperties = { color: 'var(--mp-color-text-secondary)' };
const NAV_LINK_ACTIVE: CSSProperties = { color: 'var(--mp-color-primary-default)', fontWeight: 600 };
const CONTENT: CSSProperties = {
  paddingBlock: 'var(--mp-spacing-6)',
  background: 'var(--mp-color-bg-base)',
  color: 'var(--mp-color-text-primary)',
};
const BREADCRUMB: CSSProperties = {
  display: 'flex',
  gap: 'var(--mp-spacing-2)',
  marginBottom: 'var(--mp-spacing-4)',
  color: 'var(--mp-color-text-secondary)',
  fontSize: 'var(--mp-size-font-sm)',
};
const TABS: CSSProperties = {
  display: 'flex',
  gap: 'var(--mp-spacing-4)',
  borderBottom: '1px solid var(--mp-color-border-default)',
  marginBottom: 'var(--mp-spacing-5)',
};
const TAB: CSSProperties = { padding: 'var(--mp-spacing-2) 0', color: 'var(--mp-color-text-secondary)' };
const TAB_ACTIVE: CSSProperties = {
  padding: 'var(--mp-spacing-2) 0',
  color: 'var(--mp-color-text-primary)',
  borderBottom: '2px solid var(--mp-color-primary-default)',
};
const OUTLET: CSSProperties = {
  padding: 'var(--mp-spacing-5)',
  background: 'var(--mp-color-bg-surface)',
  border: '1px solid var(--mp-color-border-default)',
  borderRadius: 'var(--mp-radius-md)',
};

/** A routed app shell with a top nav and a breadcrumb trail above the router outlet. */
export const Breadcrumbs: Story = {
  render: () => (
    <ApplicationLayout
      style={{ minHeight: '28rem' }}
      navbar={
        <div style={NAVBAR}>
          <strong>Mission Platform</strong>
          <a style={NAV_LINK_ACTIVE}>Projects</a>
          <a style={NAV_LINK}>Reports</a>
          <a style={NAV_LINK}>Team</a>
        </div>
      }
      content={
        <div style={CONTENT}>
          <Container variant="responsive">
            <nav
              aria-label="Breadcrumb"
              style={BREADCRUMB}
            >
              <span>Projects</span>
              <span>/</span>
              <span>Apollo</span>
              <span>/</span>
              <span>Overview</span>
            </nav>
            <div style={OUTLET}>
              <h1 style={{ marginTop: 0 }}>Apollo · Overview</h1>
              <p>The router outlet renders here for the matched route.</p>
            </div>
          </Container>
        </div>
      }
    />
  ),
};

/** A routed detail page with a tab strip switching between sibling sub-routes. */
export const TabbedSections: Story = {
  render: () => (
    <ApplicationLayout
      style={{ minHeight: '28rem' }}
      navbar={
        <div style={NAVBAR}>
          <strong>Mission Platform</strong>
          <a style={NAV_LINK_ACTIVE}>Projects</a>
        </div>
      }
      content={
        <div style={CONTENT}>
          <Container variant="responsive">
            <nav
              aria-label="Breadcrumb"
              style={BREADCRUMB}
            >
              <span>Projects</span>
              <span>/</span>
              <span>Apollo</span>
            </nav>
            <h1 style={{ marginTop: 0 }}>Apollo</h1>
            <nav
              aria-label="Sections"
              style={TABS}
            >
              <a style={TAB_ACTIVE}>Overview</a>
              <a style={TAB}>Activity</a>
              <a style={TAB}>Members</a>
              <a style={TAB}>Settings</a>
            </nav>
            <div style={OUTLET}>
              <p>The active tab's nested route renders in this outlet.</p>
            </div>
          </Container>
        </div>
      }
    />
  ),
};
