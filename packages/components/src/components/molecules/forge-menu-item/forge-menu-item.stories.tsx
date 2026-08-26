import { ForgeMenuItem } from '@mission-platform/components';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

/**
 * `ForgeMenuItem` is the write-once `ForgeMenuItem` component of `@mission-platform/components` — a `role="menuitem"` link (`<a href>`) or an
 * activatable span (firing `onClick` on click or Enter/Space).
 * This single neutral story renders on the framework selected by `STORYBOOK_FRAMEWORK`.
 */
const meta = {
  title: 'Molecules/Navigation/ForgeMenuItem',
  component: ForgeMenuItem,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Cross-framework `ForgeMenuItem` — authored once in the neutral JSX dialect and shipped to all supported frameworks. It renders a `role="menuitem"` link or activatable span; the `click` emit becomes the `onClick` callback prop. Styling comes from the co-located `forge-menu-item.module.scss`.',
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
  render: (arguments_) => (
    <ul
      role="menu"
      style={{ listStyle: 'none', margin: 0, padding: 0, minWidth: 200 }}
    >
      <ForgeMenuItem {...arguments_} />
    </ul>
  ),
} satisfies Meta<typeof ForgeMenuItem>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AsLink: Story = { args: { href: '/dashboard' } };

export const Active: Story = { args: { active: true } };

export const Disabled: Story = { args: { disabled: true } };

export const PrimaryTone: Story = { args: { variant: 'primary', label: 'Highlighted' } };
