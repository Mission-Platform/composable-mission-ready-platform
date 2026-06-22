import { ApplicationLayout, Container } from '@mission-platform/layouts/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * **Dashboards** — example data-dense overview layouts assembled from the
 * `@mission-platform/layouts` primitives.
 *
 * The page shell is the cross-framework {@link ApplicationLayout} (navbar +
 * scrollable content + footer); inside it a {@link Container} caps the content
 * width and token-driven inline CSS grids arrange the KPI cards, charts and
 * side panels. Presentational only — the charts are token-styled placeholders.
 */
const meta = {
  title: 'Layouts/Examples/Dashboards',
  component: ApplicationLayout,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Dashboard layouts built from `@mission-platform/layouts`: an `ApplicationLayout` shell wraps a responsive `Container`, and inline design-token grids lay out KPI cards, a main chart panel, and a secondary side panel. Presentational only — the chart/metric blocks are token-styled placeholders.',
      },
    },
  },
} satisfies Meta<typeof ApplicationLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

const NAVBAR =
  'display: flex; align-items: center; justify-content: space-between; padding: var(--mp-spacing-3) var(--mp-spacing-5); background: var(--mp-color-bg-surface); border-bottom: 1px solid var(--mp-color-border-default); color: var(--mp-color-text-primary);';
const CONTENT = 'padding-block: var(--mp-spacing-6); background: var(--mp-color-bg-base);';
const CARD =
  'padding: var(--mp-spacing-5); background: var(--mp-color-bg-surface); border: 1px solid var(--mp-color-border-default); border-radius: var(--mp-radius-md); color: var(--mp-color-text-primary);';
const KPI_LABEL = 'font-size: var(--mp-size-font-sm); color: var(--mp-color-text-secondary);';
const KPI_VALUE = 'font-size: var(--mp-size-font-2xl); font-weight: 600; margin-top: var(--mp-spacing-1);';
const CHART = 'min-height: 16rem; background: var(--mp-color-bg-sunken); border-radius: var(--mp-radius-sm);';
const FOOTER =
  'padding: var(--mp-spacing-4) var(--mp-spacing-5); background: var(--mp-color-bg-surface); border-top: 1px solid var(--mp-color-border-default); color: var(--mp-color-text-secondary);';

/** A KPI-first analytics dashboard: a responsive metric-card row above a full-width chart panel. */
export const Analytics: Story = {
  render: () => ({
    components: { ApplicationLayout, Container },
    template: `
      <ApplicationLayout style="min-height: 32rem;">
        <template #navbar>
          <div style="${NAVBAR}"><strong>Analytics</strong><span>Last 30 days</span></div>
        </template>
        <template #content>
          <div style="${CONTENT}">
            <Container variant="responsive">
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr)); gap: var(--mp-spacing-4);">
                <div style="${CARD}"><div style="${KPI_LABEL}">Active users</div><div style="${KPI_VALUE}">12,840</div></div>
                <div style="${CARD}"><div style="${KPI_LABEL}">Sessions</div><div style="${KPI_VALUE}">38,201</div></div>
                <div style="${CARD}"><div style="${KPI_LABEL}">Conversion</div><div style="${KPI_VALUE}">3.6%</div></div>
                <div style="${CARD}"><div style="${KPI_LABEL}">Revenue</div><div style="${KPI_VALUE}">$92.4k</div></div>
              </div>
              <div style="${CARD}; margin-top: var(--mp-spacing-4);">
                <h2 style="margin-top: 0;">Traffic over time</h2>
                <div style="${CHART}"></div>
              </div>
            </Container>
          </div>
        </template>
        <template #footer><div style="${FOOTER}">© Mission Platform</div></template>
      </ApplicationLayout>
    `,
  }),
};

/** A two-column dashboard: a primary chart panel beside a secondary activity/side panel. */
export const WithSidePanel: Story = {
  render: () => ({
    components: { ApplicationLayout, Container },
    template: `
      <ApplicationLayout style="min-height: 32rem;">
        <template #navbar>
          <div style="${NAVBAR}"><strong>Operations</strong><span>Live</span></div>
        </template>
        <template #content>
          <div style="${CONTENT}">
            <Container variant="responsive">
              <div style="display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: var(--mp-spacing-4);">
                <div style="${CARD}">
                  <h2 style="margin-top: 0;">Throughput</h2>
                  <div style="${CHART}"></div>
                </div>
                <div style="${CARD}">
                  <h2 style="margin-top: 0;">Recent activity</h2>
                  <ul style="margin: 0; padding-left: var(--mp-spacing-4); color: var(--mp-color-text-secondary);">
                    <li>Deploy #4821 succeeded</li>
                    <li>3 alerts acknowledged</li>
                    <li>New user onboarded</li>
                  </ul>
                </div>
              </div>
            </Container>
          </div>
        </template>
        <template #footer><div style="${FOOTER}">© Mission Platform</div></template>
      </ApplicationLayout>
    `,
  }),
};
