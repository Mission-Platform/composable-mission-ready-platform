import { Breadcrumb } from '@mission-platform/components/react';

import type { BreadcrumbItem } from './base-breadcrumb';
import type { Meta, StoryObj } from '@storybook/react-vite';

const items: BreadcrumbItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Components', href: '/components' },
  { label: 'Navigation', href: '/components/navigation' },
  { label: 'Breadcrumb' },
];

/**
 * `Breadcrumb` is the **React** build of the write-once `BaseBreadcrumb` in
 * `@mission-platform/components` — an ordered navigation trail inside a labelled
 * `<nav>`, with `href` entries as links and the last entry as the current page.
 * Authored once in the neutral JSX dialect and compiled straight to React by
 * `@mission-platform/vite-plugin-jsx`.
 */
const meta = {
  title: 'Components/Navigation/BaseBreadcrumb',
  component: Breadcrumb,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `Breadcrumb` — authored once in the neutral JSX dialect and shipped to both React (this story, via `@mission-platform/components/react`) and Vue 3 (`@mission-platform/components/vue`). It renders an ordered trail inside a labelled `<nav>`, with `href` entries as links and the last entry as the current page (`aria-current="page"`). Styling comes from the co-located `base-breadcrumb.module.scss`.',
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
  render: (arguments_) => <Breadcrumb {...arguments_} />,
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
