import { ForgeCookieConsent } from '@mission-platform/components';

import type { CookieCategory, CookieConsentProperties } from '@mission-platform/components';
import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const categories: CookieCategory[] = [
  { id: 'necessary', label: 'Necessary', required: true, description: 'Required for the service to work.' },
  { id: 'analytics', label: 'Analytics', description: 'Helps us improve the experience.' },
  { id: 'marketing', label: 'Marketing', description: 'Used to show relevant content.' },
];

const meta = {
  title: 'Organisms/Feedback/ForgeCookieConsent',
  component: ForgeCookieConsent,
  tags: ['autodocs'],
  args: {
    categories,
    title: 'Cookie preferences',
    privacyPolicyUrl: '/privacy',
    storageKey: 'storybook-cookie-consent',
  },
  argTypes: { position: { control: 'inline-radio', options: ['top', 'bottom'] } },
} satisfies Meta<typeof ForgeCookieConsent>;

export default meta;
type Story = StoryObj<CookieConsentProperties>;

export const Banner: Story = {};
export const BottomBanner: Story = { args: { position: 'bottom' } };
