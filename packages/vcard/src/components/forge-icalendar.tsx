import { ForgeCard, ForgeStack, ForgeTypography } from '@mission-platform/components';
import { h, type MpElement } from '@mission-platform/forge';

import type { ICalendarEvent } from '../parsers/icalendar';

export interface ForgeICalendarProperties {
  events: readonly ICalendarEvent[];
  title?: string;
}

export function ForgeICalendar(properties: Readonly<ForgeICalendarProperties>): MpElement {
  return (
    <ForgeCard>
      <ForgeTypography
        as="h2"
        variant="h2"
      >
        {properties.title ?? 'Calendar'}
      </ForgeTypography>
      <ForgeStack
        direction="vertical"
        gap="md"
      >
        {properties.events.map((event) => (
          <ForgeStack
            key={event.uid}
            direction="vertical"
            gap="2xs"
          >
            <ForgeTypography variant="label">{event.summary}</ForgeTypography>
            <ForgeTypography variant="body-sm">
              {event.start}
              {event.end ? ' – ' : ''}
              {event.end}
            </ForgeTypography>
            {event.location ? <ForgeTypography variant="body-sm">{event.location}</ForgeTypography> : undefined}
          </ForgeStack>
        ))}
      </ForgeStack>
    </ForgeCard>
  );
}
