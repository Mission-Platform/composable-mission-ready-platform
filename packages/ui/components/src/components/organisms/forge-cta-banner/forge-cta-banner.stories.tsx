import { ForgeCtaBanner } from '@mission-platform/components';

import type { CtaBannerProperties } from '@mission-platform/components';
import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Organisms/Marketing/ForgeCtaBanner',
  component: ForgeCtaBanner,
  tags: ['autodocs'],
  args: {
    title: 'Build better workflows',
    description: 'Bring your team together with a faster, simpler workspace.',
    actions: [{ label: 'Get started' }, { label: 'Learn more', variant: 'outline' }],
  },
} satisfies Meta<typeof ForgeCtaBanner>;

export default meta;
type Story = StoryObj<CtaBannerProperties>;

export const Default: Story = {};
export const WithImage: Story = {
  args: { backgroundImage: 'https://picsum.photos/seed/cta/480/240' },
};
export const Neutral: Story = { args: { variant: 'neutral' } };
