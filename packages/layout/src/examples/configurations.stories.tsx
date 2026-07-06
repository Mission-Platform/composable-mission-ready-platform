import { h } from 'vue';

import { VerticalLayout } from '@mission-platform/layouts/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * **Configurations** — example settings / preferences layouts assembled from the
 * `@mission-platform/layouts` primitives.
 *
 * These use the cross-framework {@link VerticalLayout}: a `start` column holds
 * the settings section nav, and the main content holds the active settings
 * pane. At/above the (here lowered) `breakpoint` the nav is a fixed-open grid
 * track; below it, it collapses to a toggleable overlay drawer. The columns are
 * `MpChild` **props**, so the stories pass them as Vue `VNode`s.
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

const NAV_ITEM = (active = false): string =>
  `display: block; padding: var(--mp-spacing-2) var(--mp-spacing-3); border-radius: var(--mp-radius-sm); color: ${active ? 'var(--mp-color-text-on-primary)' : 'var(--mp-color-text-primary)'}; background: ${active ? 'var(--mp-color-primary-default)' : 'transparent'};`;
const PANE =
  'padding: var(--mp-spacing-6); background: var(--mp-color-bg-base); height: 100%; box-sizing: border-box; color: var(--mp-color-text-primary);';
const ROW =
  'display: flex; align-items: center; justify-content: space-between; padding: var(--mp-spacing-4) 0; border-bottom: 1px solid var(--mp-color-border-default);';

const settingsNav = () =>
  h(
    'nav',
    { style: 'display: flex; flex-direction: column; gap: var(--mp-spacing-1); padding: var(--mp-spacing-3);' },
    [
      h('a', { style: NAV_ITEM(true) }, 'General'),
      h('a', { style: NAV_ITEM() }, 'Account'),
      h('a', { style: NAV_ITEM() }, 'Notifications'),
      h('a', { style: NAV_ITEM() }, 'Security'),
      h('a', { style: NAV_ITEM() }, 'Integrations'),
    ],
  );

const settingsPane = () =>
  h('div', { style: PANE }, [
    h('h1', { style: 'margin-top: 0;' }, 'General'),
    h('div', { style: ROW }, [
      h('span', 'Theme'),
      h('span', { style: 'color: var(--mp-color-text-secondary);' }, 'System'),
    ]),
    h('div', { style: ROW }, [
      h('span', 'Language'),
      h('span', { style: 'color: var(--mp-color-text-secondary);' }, 'English'),
    ]),
    h('div', { style: ROW }, [
      h('span', 'Time zone'),
      h('span', { style: 'color: var(--mp-color-text-secondary);' }, 'UTC'),
    ]),
  ]);

/** A two-pane settings screen: a section nav rail beside the active configuration pane. */
export const SettingsTwoPane: Story = {
  render: (arguments_) => ({
    setup() {
      return () => h(VerticalLayout, { ...arguments_, start: settingsNav() }, settingsPane());
    },
  }),
};
