import { ForgeICalendar } from './forge-icalendar';

import type { Meta, StoryObj } from '@mission-platform/storybook-framework';

const meta = {
  title: 'VCard/ForgeICalendar',
  component: ForgeICalendar,
} satisfies Meta<typeof ForgeICalendar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Events: Story = {
  args: {
    events: [
      {
        uid: 'planning@example.com',
        summary: 'Planning meeting',
        start: '20260810T090000Z',
        end: '20260810T100000Z',
        location: 'Room 101',
      },
      { uid: 'review@example.com', summary: 'Design review', start: '20260811T130000Z' },
    ],
  },
};
