import { ForgeTestimonialsSection } from './forge-testimonials-section';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'Organisms/Marketing/ForgeTestimonialsSection',
  component: ForgeTestimonialsSection,
  tags: ['autodocs'],
  args: {
    title: 'Loved by teams',
    testimonials: [
      { id: 'one', quote: 'A joy to use.', name: 'Sam', role: 'Founder' },
      { id: 'two', quote: 'Our team ships faster.', name: 'Alex', role: 'Product lead' },
    ],
    variant: 'carousel' as const,
    autoplay: false,
    columns: 3,
  },
} satisfies Meta<typeof ForgeTestimonialsSection>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
