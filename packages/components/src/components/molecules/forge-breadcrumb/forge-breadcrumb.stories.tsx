
import { ForgeBreadcrumb } from '@mission-platform/components';

import type { BreadcrumbItem } from './forge-breadcrumb';
import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const items: BreadcrumbItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Components', href: '/components' },
  { label: 'Navigation', href: '/components/navigation' },
  { label: 'ForgeBreadcrumb' },
];

/**
 * `ForgeBreadcrumb` is the write-once component of `@mission-platform/components`.
 * It is authored **once** in the framework-neutral JSX dialect
 * (`@mission-platform/forge`) and compiled at build time by
 * `@mission-platform/vite-plugin-forge` to every supported framework (Vue 3,
 * React, SolidJS, Svelte, and Web Components).
 *
 * This is a single, framework-agnostic story: the bare
 * `@mission-platform/components` import auto-resolves to the framework selected
 * by the `STORYBOOK_FRAMEWORK` env var, and the JSX in `render` is compiled by
 * that framework's own transform — so the same story renders on every framework.
 */
const meta = {
  title: 'Molecules/Navigation/ForgeBreadcrumb',
  component: ForgeBreadcrumb,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeBreadcrumb` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It renders an ordered trail inside a labelled `<nav>`, with `href` entries as links and the last entry as the current page (`aria-current="page"`). The original `vue-router` `RouterLink` target is substituted with a plain `<a href>`. Styling comes from the co-located `forge-breadcrumb.module.scss`.',
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
  render: (arguments_) => <ForgeBreadcrumb {...arguments_} />,
} satisfies Meta<typeof ForgeBreadcrumb>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ChevronSeparator: Story = { args: { separator: '›' } };

export const TwoLevels: Story = {
  args: {
    items: [{ label: 'Dashboard', href: '/' }, { label: 'Settings' }],
  },
};
