import { ApplicationLayout, Container } from '@mission-platform/layouts/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * **Routing** — example navigation-shell layouts assembled from the
 * `@mission-platform/layouts` primitives.
 *
 * These show the chrome a routed app hangs around its router outlet: a top nav
 * inside the {@link ApplicationLayout}, a breadcrumb trail and/or a tab strip
 * for sub-routes inside a {@link Container}, and a content region standing in
 * for the router outlet. Presentational only — wire the links/tabs to
 * `@mission-platform/router` (or any router) in a real app.
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

const NAVBAR =
  'display: flex; align-items: center; gap: var(--mp-spacing-5); padding: var(--mp-spacing-3) var(--mp-spacing-5); background: var(--mp-color-bg-surface); border-bottom: 1px solid var(--mp-color-border-default); color: var(--mp-color-text-primary);';
const NAV_LINK = 'color: var(--mp-color-text-secondary);';
const NAV_LINK_ACTIVE = 'color: var(--mp-color-primary-default); font-weight: 600;';
const CONTENT =
  'padding-block: var(--mp-spacing-6); background: var(--mp-color-bg-base); color: var(--mp-color-text-primary);';
const BREADCRUMB =
  'display: flex; gap: var(--mp-spacing-2); margin-bottom: var(--mp-spacing-4); color: var(--mp-color-text-secondary); font-size: var(--mp-size-font-sm);';
const TABS =
  'display: flex; gap: var(--mp-spacing-4); border-bottom: 1px solid var(--mp-color-border-default); margin-bottom: var(--mp-spacing-5);';
const TAB = 'padding: var(--mp-spacing-2) 0; color: var(--mp-color-text-secondary);';
const TAB_ACTIVE =
  'padding: var(--mp-spacing-2) 0; color: var(--mp-color-text-primary); border-bottom: 2px solid var(--mp-color-primary-default);';
const OUTLET =
  'padding: var(--mp-spacing-5); background: var(--mp-color-bg-surface); border: 1px solid var(--mp-color-border-default); border-radius: var(--mp-radius-md);';

/** A routed app shell with a top nav and a breadcrumb trail above the router outlet. */
export const Breadcrumbs: Story = {
  render: () => ({
    components: { ApplicationLayout, Container },
    template: `
      <ApplicationLayout style="min-height: 28rem;">
        <template #navbar>
          <div style="${NAVBAR}">
            <strong>Mission Platform</strong>
            <a style="${NAV_LINK_ACTIVE}">Projects</a>
            <a style="${NAV_LINK}">Reports</a>
            <a style="${NAV_LINK}">Team</a>
          </div>
        </template>
        <template #content>
          <div style="${CONTENT}">
            <Container variant="responsive">
              <nav aria-label="Breadcrumb" style="${BREADCRUMB}"><span>Projects</span><span>/</span><span>Apollo</span><span>/</span><span>Overview</span></nav>
              <div style="${OUTLET}">
                <h1 style="margin-top: 0;">Apollo · Overview</h1>
                <p>The router outlet renders here for the matched route.</p>
              </div>
            </Container>
          </div>
        </template>
      </ApplicationLayout>
    `,
  }),
};

/** A routed detail page with a tab strip switching between sibling sub-routes. */
export const TabbedSections: Story = {
  render: () => ({
    components: { ApplicationLayout, Container },
    template: `
      <ApplicationLayout style="min-height: 28rem;">
        <template #navbar>
          <div style="${NAVBAR}"><strong>Mission Platform</strong><a style="${NAV_LINK_ACTIVE}">Projects</a></div>
        </template>
        <template #content>
          <div style="${CONTENT}">
            <Container variant="responsive">
              <nav aria-label="Breadcrumb" style="${BREADCRUMB}"><span>Projects</span><span>/</span><span>Apollo</span></nav>
              <h1 style="margin-top: 0;">Apollo</h1>
              <nav aria-label="Sections" style="${TABS}">
                <a style="${TAB_ACTIVE}">Overview</a>
                <a style="${TAB}">Activity</a>
                <a style="${TAB}">Members</a>
                <a style="${TAB}">Settings</a>
              </nav>
              <div style="${OUTLET}">
                <p>The active tab's nested route renders in this outlet.</p>
              </div>
            </Container>
          </div>
        </template>
      </ApplicationLayout>
    `,
  }),
};
