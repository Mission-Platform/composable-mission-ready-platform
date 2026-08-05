import { h } from '@mission-platform/forge';

import { ApplicationLayout, Container } from '@mission-platform/layouts';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

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

const NAVBAR = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: 'var(--mp-spacing-3) var(--mp-spacing-5)',
  background: 'var(--mp-color-bg-surface)',
  borderBottom: '1px solid var(--mp-color-border-default)',
  color: 'var(--mp-color-text-primary)',
};
const CONTENT = { paddingBlock: 'var(--mp-spacing-6)', background: 'var(--mp-color-bg-base)' };
const CARD = {
  padding: 'var(--mp-spacing-5)',
  background: 'var(--mp-color-bg-surface)',
  border: '1px solid var(--mp-color-border-default)',
  borderRadius: 'var(--mp-radius-md)',
  color: 'var(--mp-color-text-primary)',
};
const KPI_LABEL = { fontSize: 'var(--mp-size-font-sm)', color: 'var(--mp-color-text-secondary)' };
const KPI_VALUE = { fontSize: 'var(--mp-size-font-2xl)', fontWeight: 600, marginTop: 'var(--mp-spacing-1)' };
const CHART = { minHeight: '16rem', background: 'var(--mp-color-bg-sunken)', borderRadius: 'var(--mp-radius-sm)' };
const FOOTER = {
  padding: 'var(--mp-spacing-4) var(--mp-spacing-5)',
  background: 'var(--mp-color-bg-surface)',
  borderTop: '1px solid var(--mp-color-border-default)',
  color: 'var(--mp-color-text-secondary)',
};

/** A KPI-first analytics dashboard: a responsive metric-card row above a full-width chart panel. */
export const Analytics: Story = {
  render: () => (
    <ApplicationLayout
      style={{ minHeight: '32rem' }}
      navbar={<div style={NAVBAR}><strong>Analytics</strong><span>Last 30 days</span></div>}
      content={
        <div style={CONTENT}>
          <Container variant="responsive">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(11rem, 1fr))', gap: 'var(--mp-spacing-4)' }}>
              <div style={CARD}><div style={KPI_LABEL}>Active users</div><div style={KPI_VALUE}>12,840</div></div>
              <div style={CARD}><div style={KPI_LABEL}>Sessions</div><div style={KPI_VALUE}>38,201</div></div>
              <div style={CARD}><div style={KPI_LABEL}>Conversion</div><div style={KPI_VALUE}>3.6%</div></div>
              <div style={CARD}><div style={KPI_LABEL}>Revenue</div><div style={KPI_VALUE}>$92.4k</div></div>
            </div>
            <div style={{ ...CARD, marginTop: 'var(--mp-spacing-4)' }}>
              <h2 style={{ marginTop: 0 }}>Traffic over time</h2>
              <div style={CHART} />
            </div>
          </Container>
        </div>
      }
      footer={<div style={FOOTER}>© Mission Platform</div>}
    />
  ),
};

/** A two-column dashboard: a primary chart panel beside a secondary activity/side panel. */
export const WithSidePanel: Story = {
  render: () => (
    <ApplicationLayout
      style={{ minHeight: '32rem' }}
      navbar={<div style={NAVBAR}><strong>Operations</strong><span>Live</span></div>}
      content={
        <div style={CONTENT}>
          <Container variant="responsive">
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 'var(--mp-spacing-4)' }}>
              <div style={CARD}>
                <h2 style={{ marginTop: 0 }}>Throughput</h2>
                <div style={CHART} />
              </div>
              <div style={CARD}>
                <h2 style={{ marginTop: 0 }}>Recent activity</h2>
                <ul style={{ margin: 0, paddingLeft: 'var(--mp-spacing-4)', color: 'var(--mp-color-text-secondary)' }}>
                  <li>Deploy #4821 succeeded</li>
                  <li>3 alerts acknowledged</li>
                  <li>New user onboarded</li>
                </ul>
              </div>
            </div>
          </Container>
        </div>
      }
      footer={<div style={FOOTER}>© Mission Platform</div>}
    />
  ),
};
