import { Breadcrumb } from '@mission-platform/components/vue';

import type { BreadcrumbItem } from './base-breadcrumb';
import type { Meta, StoryObj } from '@storybook/vue3-vite';

const items: BreadcrumbItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Components', href: '/components' },
  { label: 'Navigation', href: '/components/navigation' },
  { label: 'Breadcrumb' },
];

/**
 * `Breadcrumb` is the Vue 3 build of the write-once `BaseBreadcrumb` in this
 * package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/jsx`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-jsx`. The very same source also
 * ships as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Navigation/BaseBreadcrumb',
  component: Breadcrumb,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Breadcrumb` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). It renders an ordered trail inside a labelled `<nav>`, with `href` entries as links and the last entry as the current page (`aria-current="page"`). The original `vue-router` `RouterLink` target is substituted with a plain `<a href>`. Styling comes from the co-located `base-breadcrumb.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    separator: { control: 'text' },
  },
  args: {
    items,
    separator: '/',
  },
  render: (arguments_) => ({
    components: { Breadcrumb },
    setup() {
      return { args: arguments_ };
    },
    template: '<Breadcrumb v-bind="args" />',
  }),
} satisfies Meta<typeof Breadcrumb>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ChevronSeparator: Story = { args: { separator: '›' } };

export const TwoLevels: Story = {
  args: {
    items: [{ label: 'Dashboard', href: '/' }, { label: 'Settings' }],
  },
};
