import { ForgeErrorPage } from '@mission-platform/components';

import type { ErrorPageAction, ErrorPageProperties } from '@mission-platform/components';
import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const actions: ErrorPageAction[] = [
  { id: 'home', label: 'Return home', href: '/', variant: 'primary' },
  { id: 'support', label: 'Contact support', href: '/support', variant: 'secondary' },
];

const meta = {
  title: 'Organisms/Feedback/ForgeErrorPage',
  component: ForgeErrorPage,
  tags: ['autodocs'],
  args: {
    code: 404,
    description: 'The requested mission could not be found.',
    actions,
    showHomeLink: true,
    homeUrl: '/',
  },
} satisfies Meta<typeof ForgeErrorPage>;

export default meta;
type Story = StoryObj<ErrorPageProperties>;

export const NotFound: Story = {};
export const ServerError: Story = {
  args: { code: 500, title: 'Service unavailable', description: 'Please try again in a moment.' },
};
