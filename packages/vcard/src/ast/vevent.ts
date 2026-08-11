/** Recurrence frequency as defined by RFC 5545 § 3.3.10. */
export type RRuleFreq = 'SECONDLY' | 'MINUTELY' | 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export type RRuleWeekday = 'SU' | 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA';

export interface RRule {
  freq: RRuleFreq;
  count?: number;
  until?: string;
  interval?: number;
  byday?: RRuleWeekday[];
  bymonthday?: number[];
  bymonth?: number[];
  bysetpos?: number[];
}

export type VEventStatus = 'TENTATIVE' | 'CONFIRMED' | 'CANCELLED';
export type VEventClass = 'PUBLIC' | 'PRIVATE' | 'CONFIDENTIAL';
export type VEventTransp = 'OPAQUE' | 'TRANSPARENT';

export interface VEventAttendee {
  calAddress: string;
  cn?: string;
  role?: 'CHAIR' | 'REQ-PARTICIPANT' | 'OPT-PARTICIPANT' | 'NON-PARTICIPANT';
  partstat?: 'NEEDS-ACTION' | 'ACCEPTED' | 'DECLINED' | 'TENTATIVE' | 'DELEGATED';
}

export interface VAlarm {
  action: 'AUDIO' | 'DISPLAY' | 'EMAIL';
  trigger: string;
  description?: string;
}

export interface VEvent {
  uid: string;
  dtstart: string;
  dtend: string;
  dtstamp: string;
  summary?: string;
  description?: string;
  location?: string;
  url?: string;
  color?: string;
  classification?: VEventClass;
  status?: VEventStatus;
  transp?: VEventTransp;
  priority?: number;
  organizer?: string;
  attendees?: VEventAttendee[];
  rrule?: RRule;
  rdates?: string[];
  exdates?: string[];
  recurrenceId?: string;
  masterUid?: string;
  alarms?: VAlarm[];
  created?: string;
  lastModified?: string;
  sequence?: number;
}
