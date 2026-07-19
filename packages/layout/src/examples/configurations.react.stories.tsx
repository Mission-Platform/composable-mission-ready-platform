import { VerticalLayout } from '@mission-platform/layouts/react';

import type { CSSProperties, ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

/**
 * **Configurations** — example settings / preferences layouts assembled from the
 * `@mission-platform/layouts` primitives (React build).
 *
 * These use the cross-framework {@link VerticalLayout}: a `start` column holds
 * the settings section nav, and the main content holds the active settings
 * pane. At/above the (here lowered) `breakpoint` the nav is a fixed-open grid
 * track; below it, it collapses to a toggleable overlay drawer. The columns are
 * `MpChild` **props**.
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

const navItem = (active = false): CSSProperties => ({
  display: 'block',
  padding: 'var(--mp-spacing-2) var(--mp-spacing-3)',
  borderRadius: 'var(--mp-radius-sm)',
  color: active ? 'var(--mp-color-text-on-primary)' : 'var(--mp-color-text-primary)',
  background: active ? 'var(--mp-color-primary-default)' : 'transparent',
});
const PANE: CSSProperties = {
  padding: 'var(--mp-spacing-6)',
  background: 'var(--mp-color-bg-base)',
  height: '100%',
  boxSizing: 'border-box',
  color: 'var(--mp-color-text-primary)',
};
const ROW: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: 'var(--mp-spacing-4) 0',
  borderBottom: '1px solid var(--mp-color-border-default)',
};
const MUTED: CSSProperties = { color: 'var(--mp-color-text-secondary)' };

const settingsNav = (): ReactNode => (
  <nav style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mp-spacing-1)', padding: 'var(--mp-spacing-3)' }}>
    <a style={navItem(true)}>General</a>
    <a style={navItem()}>Account</a>
    <a style={navItem()}>Notifications</a>
    <a style={navItem()}>Security</a>
    <a style={navItem()}>Integrations</a>
  </nav>
);

const settingsPane = (): ReactNode => (
  <div style={PANE}>
    <h1 style={{ marginTop: 0 }}>General</h1>
    <div style={ROW}>
      <span>Theme</span>
      <span style={MUTED}>System</span>
    </div>
    <div style={ROW}>
      <span>Language</span>
      <span style={MUTED}>English</span>
    </div>
    <div style={ROW}>
      <span>Time zone</span>
      <span style={MUTED}>UTC</span>
    </div>
  </div>
);

/** A two-pane settings screen: a section nav rail beside the active configuration pane. */
export const SettingsTwoPane: Story = {
  render: (arguments_) => (
    <VerticalLayout
      {...arguments_}
      start={settingsNav()}
    >
      {settingsPane()}
    </VerticalLayout>
  ),
};
