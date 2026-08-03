import { MenuItem } from '@mission-platform/components/vue';

import type { Meta, StoryObj } from '@storybook/vue3-vite';

/**
 * `MenuItem` is the Vue 3 build of the write-once `BaseMenuItem` in this
 * package. The component is authored **once** in the framework-neutral JSX
 * dialect (`@mission-platform/forge`) and compiled straight to a Vue component at
 * build time by `@mission-platform/vite-plugin-forge`. The very same source also
 * ships as a React component via the package's `./react` subpath.
 */
const meta = {
  title: 'Components/Navigation/BaseMenuItem',
  component: MenuItem,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `MenuItem` — authored once in the neutral JSX dialect and shipped to both Vue 3 (this story, via `@mission-platform/components/vue`) and React (`@mission-platform/components/react`). It renders a `role="menuitem"` link (`<a href>`) or an activatable span (firing `onClick` on click or Enter/Space). The original `vue-router` `RouterLink` target is substituted with a plain `<a href>` and the `click` emit becomes the `onClick` callback prop. Styling comes from the co-located `base-menu-item.module.scss`.',
      },
    },
  },
  argTypes: {
    size: { control: 'select', options: ['2xs', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    variant: {
      control: 'select',
      options: [
        'default',
        'primary',
        'secondary',
        'tertiary',
        'success',
        'warning',
        'information',
        'error',
        'critical',
      ],
    },
    disabled: { control: 'boolean' },
    active: { control: 'boolean' },
    href: { control: 'text' },
  },
  args: {
    label: 'Dashboard',
    variant: 'default',
    disabled: false,
    active: false,
  },
  render: (arguments_) => ({
    components: { MenuItem },
    setup() {
      return { args: arguments_ };
    },
    template:
      '<ul role="menu" style="list-style: none; margin: 0; padding: 0; min-width: 200px;"><MenuItem v-bind="args" /></ul>',
  }),
} satisfies Meta<typeof MenuItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AsLink: Story = { args: { href: '/dashboard' } };

export const Active: Story = { args: { active: true } };

export const Disabled: Story = { args: { disabled: true } };

export const PrimaryTone: Story = { args: { variant: 'primary', label: 'Highlighted' } };
