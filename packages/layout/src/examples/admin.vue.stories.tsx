import { h } from 'vue';

import { VerticalLayout } from '@mission-platform/layouts/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * **Admin** — example back-office / console layouts assembled from the
 * `@mission-platform/layouts` primitives.
 *
 * These pair the cross-framework {@link VerticalLayout} (a persistent `start`
 * navigation rail beside the main work area) with token-driven inline tables
 * and an optional `end` detail panel. The columns are `MpChild` **props**, so
 * the stories pass them as Vue `VNode`s. Presentational only.
 */
const meta = {
  title: 'Layouts/Examples/Admin',
  component: VerticalLayout,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Admin console layouts built from `@mission-platform/layouts`: a `VerticalLayout` provides a persistent `start` nav rail beside a main data-table work area, optionally flanked by an `end` detail/inspector panel. The side columns stay inline above `breakpoint` and collapse to overlay drawers below it. Presentational only.',
      },
    },
  },
  argTypes: {
    breakpoint: { control: 'inline-radio', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
  },
  args: { breakpoint: 'xs', startSize: 'xs', startTitle: 'Navigation' },
} satisfies Meta<typeof VerticalLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

const NAV_ITEM = (active = false): string =>
  `display: block; padding: var(--mp-spacing-2) var(--mp-spacing-3); border-radius: var(--mp-radius-sm); color: ${active ? 'var(--mp-color-text-on-primary)' : 'var(--mp-color-text-primary)'}; background: ${active ? 'var(--mp-color-primary-default)' : 'transparent'};`;
const WORK =
  'padding: var(--mp-spacing-6); background: var(--mp-color-bg-base); height: 100%; box-sizing: border-box; color: var(--mp-color-text-primary);';
const TOOLBAR =
  'display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--mp-spacing-4);';
const PRIMARY =
  'padding: var(--mp-spacing-2) var(--mp-spacing-4); background: var(--mp-color-primary-default); color: var(--mp-color-text-on-primary); border: none; border-radius: var(--mp-radius-sm);';
const TABLE = 'width: 100%; border-collapse: collapse;';
const TH =
  'text-align: left; padding: var(--mp-spacing-2) var(--mp-spacing-3); border-bottom: 2px solid var(--mp-color-border-default); color: var(--mp-color-text-secondary); font-size: var(--mp-size-font-sm);';
const TD = 'padding: var(--mp-spacing-3); border-bottom: 1px solid var(--mp-color-border-default);';

const adminNav = () =>
  h(
    'nav',
    { style: 'display: flex; flex-direction: column; gap: var(--mp-spacing-1); padding: var(--mp-spacing-3);' },
    [
      h('a', { style: NAV_ITEM(true) }, 'Users'),
      h('a', { style: NAV_ITEM() }, 'Teams'),
      h('a', { style: NAV_ITEM() }, 'Roles'),
      h('a', { style: NAV_ITEM() }, 'Audit log'),
      h('a', { style: NAV_ITEM() }, 'Settings'),
    ],
  );

const usersTable = () =>
  h('div', { style: WORK }, [
    h('div', { style: TOOLBAR }, [
      h('h1', { style: 'margin: 0;' }, 'Users'),
      h('button', { type: 'button', style: PRIMARY }, 'Invite user'),
    ]),
    h('table', { style: TABLE }, [
      h(
        'thead',
        {},
        h('tr', {}, [h('th', { style: TH }, 'Name'), h('th', { style: TH }, 'Role'), h('th', { style: TH }, 'Status')]),
      ),
      h('tbody', {}, [
        h('tr', {}, [
          h('td', { style: TD }, 'Ada Lovelace'),
          h('td', { style: TD }, 'Admin'),
          h('td', { style: TD }, 'Active'),
        ]),
        h('tr', {}, [
          h('td', { style: TD }, 'Alan Turing'),
          h('td', { style: TD }, 'Editor'),
          h('td', { style: TD }, 'Active'),
        ]),
        h('tr', {}, [
          h('td', { style: TD }, 'Grace Hopper'),
          h('td', { style: TD }, 'Viewer'),
          h('td', { style: TD }, 'Invited'),
        ]),
      ]),
    ]),
  ]);

const detailPanel = () =>
  h(
    'div',
    {
      style: 'padding: var(--mp-spacing-5); height: 100%; box-sizing: border-box; color: var(--mp-color-text-primary);',
    },
    [
      h('h2', { style: 'margin-top: 0;' }, 'Ada Lovelace'),
      h('p', { style: 'color: var(--mp-color-text-secondary);' }, 'Admin · ada@example.com'),
      h('p', 'Member since 2021. Last active 2 hours ago.'),
    ],
  );

/** A console with a persistent nav rail beside a data table and toolbar. */
export const DataTable: Story = {
  render: (arguments_) => ({
    setup() {
      return () => h(VerticalLayout, { ...arguments_, start: adminNav() }, usersTable());
    },
  }),
};

/** The same console with an `end` detail/inspector panel for the selected row. */
export const WithDetailPanel: Story = {
  render: (arguments_) => ({
    setup() {
      return () =>
        h(
          VerticalLayout,
          { ...arguments_, start: adminNav(), end: detailPanel(), endSize: 'xs', endTitle: 'Details' },
          usersTable(),
        );
    },
  }),
};
