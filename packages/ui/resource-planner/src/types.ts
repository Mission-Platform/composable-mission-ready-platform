import type { DateRange, VEvent, WeekStart } from "@mission-platform/vcard";

export type PlannerScale = "hour" | "day" | "month";

export interface PlannerResource {
  id: string;
  label: string;
  subtitle?: string;
  avatar?: string;
  capacity?: number;
}

export interface PlannerAssignment {
  eventId: string;
  resourceId: string;
}

export interface AvailabilityInterval {
  start: string;
  end: string;
  capacity?: number;
}

export interface WorkingHoursRule {
  /** Weekday using JavaScript numbering: Sunday = 0 through Saturday = 6. */
  weekday: number;
  startTime: string;
  endTime: string;
  capacity?: number;
}

export interface AvailabilityException {
  date: string;
  intervals: AvailabilityInterval[];
}

export interface ResourceAvailability {
  resourceId: string;
  intervals?: AvailabilityInterval[];
  workingHours?: WorkingHoursRule[];
  exceptions?: AvailabilityException[];
}

export type AvailabilityInput =
  | ResourceAvailability[]
  | Record<string, Omit<ResourceAvailability, "resourceId">>;

export interface NormalizedAvailabilityInterval extends AvailabilityInterval {
  resourceId: string;
}

export interface PlannerEventRecord {
  event: VEvent;
  resourceId: string;
}

export interface TimelineSegment {
  start: Date;
  end: Date;
  label: string;
  index: number;
  width: number;
}

export interface TimelineOptions {
  slotWidth?: number;
  locale?: string;
  zone?: string;
}

export interface PlannerEventGeometry {
  event: VEvent;
  resourceId: string;
  left: number;
  width: number;
  column: number;
  totalColumns: number;
}

export type CapacityStatus =
  "available" | "unavailable" | "over-capacity" | "conflict";

export interface CapacityState {
  resourceId: string;
  start: Date;
  end: Date;
  availableMinutes: number;
  bookedMinutes: number;
  remainingMinutes: number;
  capacityUnits: number;
  bookedCapacityUnits: number;
  remainingCapacityUnits: number;
  status: CapacityStatus;
}

export interface PlannerEditOptions {
  boundary?: DateRange;
  minimumDurationMs?: number;
}

export interface PlannerRangeSelection {
  resourceId: string;
  start: string;
  end: string;
}

export interface PlannerAssignmentUpdate {
  eventId: string;
  resourceId: string;
}

export interface PlannerViewState {
  scale: PlannerScale;
  anchor: Date;
  weekStartsOn?: WeekStart;
}
