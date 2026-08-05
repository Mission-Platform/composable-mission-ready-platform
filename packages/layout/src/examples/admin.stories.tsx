import { h } from '@mission-platform/forge';

import { ForgeVerticalLayout } from '@mission-platform/layouts';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * **Admin** — example back-office / console layouts assembled from the
 * `@mission-platform/layouts` primitives.
 *
 * These pair the cross-framework {@link ForgeVerticalLayout} (a persistent `start`
 * navigation rail beside the main work area) with token-driven inline tables
 * and an optional `end` detail panel. Presentational only.
 */
const meta = {
  title: 'Layouts/Examples/Admin',
  component: ForgeVerticalLayout,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Admin console layouts built from `@mission-platform/layouts`: a `ForgeVerticalLayout` provides a persistent `start` nav rail beside a main data-table work area, optionally flanked by an `end` detail/inspector panel. The side columns stay inline above `breakpoint` and collapse to overlay drawers below it. Presentational only.',
      },
    },
  },
  argTypes: {
    breakpoint: { control: 'inline-radio', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
  },
  args: { breakpoint: 'xs', startSize: 'xs', startTitle: 'Navigation' },
} satisfies Meta<typeof ForgeVerticalLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

const NAV_ITEM = (active = false) => ({
  display: 'block',
  padding: 'var(--mp-spacing-2) var(--mp-spacing-3)',
  borderRadius: 'var(--mp-radius-sm)',
  color: active ? 'var(--mp-color-text-on-primary)' : 'var(--mp-color-text-primary)',
  background: active ? 'var(--mp-color-primary-default)' : 'transparent',
  textDecoration: 'none',
});
const WORK = {
  padding: 'var(--mp-spacing-6)',
  background: 'var(--mp-color-bg-base)',
  height: '100%',
  boxSizing: 'border-box' as const,
  color: 'var(--mp-color-text-primary)',
};
const TOOLBAR = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 'var(--mp-spacing-4)',
};
const PRIMARY = {
  padding: 'var(--mp-spacing-2) var(--mp-spacing-4)',
  background: 'var(--mp-color-primary-default)',
  color: 'var(--mp-color-text-on-primary)',
  border: 'none',
  borderRadius: 'var(--mp-radius-sm)',
};
const TABLE = { width: '100%', borderCollapse: 'collapse' as const };
const TH = {
  textAlign: 'left' as const,
  padding: 'var(--mp-spacing-2) var(--mp-spacing-3)',
  borderBottom: '2px solid var(--mp-color-border-default)',
  color: 'var(--mp-color-text-secondary)',
  fontSize: 'var(--mp-size-font-sm)',
};
const TD = { padding: 'var(--mp-spacing-3)', borderBottom: '1px solid var(--mp-color-border-default)' };

const adminNav = () => (
  <nav style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mp-spacing-1)', padding: 'var(--mp-spacing-3)' }}>
    <a style={NAV_ITEM(true)}>Users</a>
    <a style={NAV_ITEM()}>Teams</a>
    <a style={NAV_ITEM()}>Roles</a>
    <a style={NAV_ITEM()}>Audit log</a>
    <a style={NAV_ITEM()}>Settings</a>
  </nav>
);

const usersTable = () => (
  <div style={WORK}>
    <div style={TOOLBAR}>
      <h1 style={{ margin: 0 }}>Users</h1>
      <button
        type="button"
        style={PRIMARY}
      >
        Invite user
      </button>
    </div>
    <table style={TABLE}>
      <thead>
        <tr>
          <th style={TH}>Name</th>
          <th style={TH}>Role</th>
          <th style={TH}>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style={TD}>Ada Lovelace</td>
          <td style={TD}>Admin</td>
          <td style={TD}>Active</td>
        </tr>
        <tr>
          <td style={TD}>Alan Turing</td>
          <td style={TD}>Editor</td>
          <td style={TD}>Active</td>
        </tr>
        <tr>
          <td style={TD}>Grace Hopper</td>
          <td style={TD}>Viewer</td>
          <td style={TD}>Invited</td>
        </tr>
      </tbody>
    </table>
  </div>
);

const detailPanel = () => (
  <div
    style={{
      padding: 'var(--mp-spacing-5)',
      height: '100%',
      boxSizing: 'border-box',
      color: 'var(--mp-color-text-primary)',
    }}
  >
    <h2 style={{ marginTop: 0 }}>Ada Lovelace</h2>
    <p style={{ color: 'var(--mp-color-text-secondary)' }}>Admin · ada@example.com</p>
    <p>Member since 2021. Last active 2 hours ago.</p>
  </div>
);

/** A console with a persistent nav rail beside a data table and toolbar. */
export const DataTable: Story = {
  render: (arguments_) => (
    <ForgeVerticalLayout
      {...arguments_}
      start={adminNav()}
    >
      {usersTable()}
    </ForgeVerticalLayout>
  ),
};

/** The same console with an `end` detail/inspector panel for the selected row. */
export const WithDetailPanel: Story = {
  render: (arguments_) => (
    <ForgeVerticalLayout
      {...arguments_}
      start={adminNav()}
      end={detailPanel()}
      endSize="xs"
      endTitle="Details"
    >
      {usersTable()}
    </ForgeVerticalLayout>
  ),
};
