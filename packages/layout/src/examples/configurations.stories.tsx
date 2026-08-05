import { h } from '@mission-platform/forge';

import { VerticalLayout } from '@mission-platform/layouts';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * **Configurations** — example settings / preferences layouts assembled from the
 * `@mission-platform/layouts` primitives.
 *
 * These use the cross-framework {@link VerticalLayout}: a `start` column holds
 * the settings section nav, and the main content holds the active settings
 * pane.
 */
const meta = {
  title: 'Layouts/Examples/Configurations',
  component: VerticalLayout,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Settings layouts built from `@mission-platform/layouts`: a `VerticalLayout` puts a sticky section-nav in the `start` column beside the active settings pane in the main content. The nav stays inline above `breakpoint` and collapses to an overlay drawer below it. Presentational only — the controls are token-styled placeholders.',
      },
    },
  },
  argTypes: {
    breakpoint: { control: 'inline-radio', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
  },
  args: { breakpoint: 'xs', startSize: 'xs', startTitle: 'Settings' },
} satisfies Meta<typeof VerticalLayout>;

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
const PANE = {
  padding: 'var(--mp-spacing-6)',
  background: 'var(--mp-color-bg-base)',
  height: '100%',
  boxSizing: 'border-box' as const,
  color: 'var(--mp-color-text-primary)',
};
const ROW = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: 'var(--mp-spacing-4) 0',
  borderBottom: '1px solid var(--mp-color-border-default)',
};

const settingsNav = () => (
  <nav style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mp-spacing-1)', padding: 'var(--mp-spacing-3)' }}>
    <a style={NAV_ITEM(true)}>General</a>
    <a style={NAV_ITEM()}>Account</a>
    <a style={NAV_ITEM()}>Notifications</a>
    <a style={NAV_ITEM()}>Security</a>
    <a style={NAV_ITEM()}>Integrations</a>
  </nav>
);

const settingsPane = () => (
  <div style={PANE}>
    <h1 style={{ marginTop: 0 }}>General</h1>
    <div style={ROW}>
      <span>Theme</span>
      <span style={{ color: 'var(--mp-color-text-secondary)' }}>System</span>
    </div>
    <div style={ROW}>
      <span>Language</span>
      <span style={{ color: 'var(--mp-color-text-secondary)' }}>English</span>
    </div>
    <div style={ROW}>
      <span>Time zone</span>
      <span style={{ color: 'var(--mp-color-text-secondary)' }}>UTC</span>
    </div>
  </div>
);

/** A two-pane settings screen: a section nav rail beside the active configuration pane. */
export const SettingsTwoPane: Story = {
  render: (arguments_) => <VerticalLayout {...arguments_} start={settingsNav()}>{settingsPane()}</VerticalLayout>,
};
