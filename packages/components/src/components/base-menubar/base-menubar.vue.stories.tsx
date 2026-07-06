import { Menubar } from '@mission-platform/components/vue';

import type { MenuItem } from '../base-menu';
import type { Meta, StoryObj } from '@storybook/vue3-vite';

const items: MenuItem[] = [
  {
    label: 'File',
    children: [{ label: 'New', href: '/new' }, { label: 'Open', href: '/open' }, { label: 'Save' }],
  },
  {
    label: 'Edit',
    children: [{ label: 'Undo' }, { label: 'Redo' }, { label: 'Cut', disabled: true }],
  },
  {
    label: 'View',
    children: [
      { label: 'Zoom in' },
      { label: 'Zoom out' },
      {
        label: 'Appearance',
        children: [{ label: 'Light' }, { label: 'Dark' }, { label: 'System' }],
      },
    ],
  },
  { label: 'Help', href: '/help' },
];

/**
 * `Menubar` is the Vue 3 build of the write-once `BaseMenubar` in this package.
 * The component is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/jsx`) and compiled straight to a Vue component at build
 * time by `@mission-platform/vite-plugin-jsx`. The very same source also ships
 * as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Navigation/BaseMenubar',
  component: Menubar,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Menubar` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). It renders a horizontal `role="menubar"` whose items open dropdown submenus that nest **to any depth** (one open per level, the ancestor chain staying open); clicking outside or pressing Escape closes them. Mirroring the recursive Vue `BaseMenuSubmenu`, the JSX version recurses through a single `renderItems` walk driven by a path-keyed `openPath`; when `items` is omitted it renders the default slot, icons become text glyphs, and `vue-router` targets become a plain `<a href>`. Styling comes from the co-located `base-menubar.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    label: { control: 'text' },
    bordered: { control: 'boolean' },
  },
  args: {
    items,
    label: 'Application menu',
    bordered: true,
  },
  render: (arguments_) => ({
    components: { Menubar },
    setup() {
      return { args: arguments_ };
    },
    template: '<div style="padding-bottom: 12rem;"><Menubar v-bind="args" /></div>',
  }),
} satisfies Meta<typeof Menubar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Borderless: Story = { args: { bordered: false } };

export const DefaultSlot: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'With no `items`, the menubar renders its **default slot** instead — matching the Vue SFC’s `<slot v-else>` fallback.',
      },
    },
  },
  render: () => ({
    components: { Menubar },
    template:
      '<Menubar label="Custom" :bordered="true"><span style="padding: 0 0.5rem;">Custom menubar content</span></Menubar>',
  }),
};
