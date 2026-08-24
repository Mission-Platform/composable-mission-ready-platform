import { ForgeSiteFooter } from './forge-site-footer';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Organisms/Navigation/ForgeSiteFooter',
  component: ForgeSiteFooter,
  tags: ['autodocs'],
  args: {
    logo: 'Mission',
    description: 'Build better products together.',
    columns: [
      {
        title: 'Company',
        links: [
          { label: 'About', href: '/about' },
          { label: 'Contact', href: '/contact' },
        ],
      },
    ],
    socials: [{ id: 'github', label: 'GitHub', href: '/github' }],
    newsletter: true,
    copyright: '© 2026 Mission',
  },
} satisfies Meta<typeof ForgeSiteFooter>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
