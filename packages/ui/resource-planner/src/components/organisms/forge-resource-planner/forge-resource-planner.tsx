import {
  createForgeStyle,
  type CSSStyleProperties,
  type MpChild,
  type MpElement,
  type MpRenderProperty,
  Slot,
  useState,
} from "@mission-platform/forge-jsx";
import { stepAnchor } from "@mission-platform/scheduler";
import {
  addDays,
  addMonths,
  startOfDay,
  startOfMonth,
  startOfWeek,
  type VEvent as SchedulerEvent,
  type WeekStart,
} from "@mission-platform/vcard";

import {
  calculateCapacityState,
  expandAvailability,
  generateTimelineSegments,
  layoutResourceEvents,
  movePlannerEventPatch,
  normalizePlannerEvents,
  positionToTime,
  reassignPlannerEvent,
  resizePlannerEventPatch,
  selectPlannerRange,
  timeToPosition,
} from "../../../utils";

import styles from "./forge-resource-planner.module.scss";

import type {
  AvailabilityInput,
  CapacityState,
  PlannerAssignment,
  PlannerAssignmentUpdate,
  PlannerEventGeometry,
  PlannerResource,
  PlannerScale,
  TimelineSegment,
} from "../../../types";

export interface PlannerResourceScope {
  resource: PlannerResource;
}

export interface PlannerBookingScope {
  event: SchedulerEvent;
  resource: PlannerResource;
  geometry: PlannerEventGeometry;
}

export interface PlannerCapacityScope {
  resource: PlannerResource;
  segment: TimelineSegment;
  state: CapacityState;
}

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface ResourcePlannerStyleProperties {
  readonly "booking-conflict-surface"?: string;
  readonly "booking-focus-ring"?: string;
  readonly "booking-height-inset"?: string;
  readonly "booking-padding-block"?: string;
  readonly "booking-padding-inline"?: string;
  readonly "booking-radius"?: string;
  readonly "booking-surface"?: string;
  readonly "booking-text"?: string;
  readonly "capacity-border"?: string;
  readonly "capacity-border-width"?: string;
  readonly "capacity-conflict-surface"?: string;
  readonly "capacity-font-size"?: string;
  readonly "capacity-unavailable-surface"?: string;
  readonly "container-border"?: string;
  readonly "container-border-width"?: string;
  readonly "container-gap"?: string;
  readonly "container-padding"?: string;
  readonly "container-radius"?: string;
  readonly "container-surface"?: string;
  readonly "control-border"?: string;
  readonly "control-border-width"?: string;
  readonly "control-padding-block"?: string;
  readonly "control-padding-inline"?: string;
  readonly "control-radius"?: string;
  readonly "control-selected-surface"?: string;
  readonly "control-selected-text"?: string;
  readonly "control-surface"?: string;
  readonly "control-text"?: string;
  readonly "current-time-surface"?: string;
  readonly "current-time-width"?: string;
  readonly "empty-text"?: string;
  readonly "header-border"?: string;
  readonly "header-border-width"?: string;
  readonly "header-surface"?: string;
  readonly "resource-border"?: string;
  readonly "resource-border-width"?: string;
  readonly "resource-gap"?: string;
  readonly "resource-heading-weight"?: string;
  readonly "resource-padding"?: string;
  readonly "resource-secondary-text"?: string;
  readonly "resource-surface"?: string;
  readonly "row-border"?: string;
  readonly "row-border-width"?: string;
  readonly "selection-border"?: string;
  readonly "selection-border-style"?: string;
  readonly "selection-border-width"?: string;
  readonly "selection-height-inset"?: string;
  readonly "selection-surface"?: string;
  readonly "timeline-border"?: string;
  readonly "timeline-border-width"?: string;
  readonly "timeline-header-font-size"?: string;
  readonly "timeline-header-padding"?: string;
  readonly "timeline-header-text"?: string;
  readonly "timeline-selected-ring"?: string;
  readonly "toolbar-gap"?: string;
  readonly "viewport-border"?: string;
  readonly "viewport-border-width"?: string;
}

export type ResourcePlannerStyle = CSSStyleProperties & {
  readonly "--forge-resource-planner-booking-conflict-surface"?:
    string | undefined;
  readonly "--forge-resource-planner-booking-focus-ring"?: string | undefined;
  readonly "--forge-resource-planner-booking-height-inset"?: string | undefined;
  readonly "--forge-resource-planner-booking-padding-block"?:
    string | undefined;
  readonly "--forge-resource-planner-booking-padding-inline"?:
    string | undefined;
  readonly "--forge-resource-planner-booking-radius"?: string | undefined;
  readonly "--forge-resource-planner-booking-surface"?: string | undefined;
  readonly "--forge-resource-planner-booking-text"?: string | undefined;
  readonly "--forge-resource-planner-capacity-border"?: string | undefined;
  readonly "--forge-resource-planner-capacity-border-width"?:
    string | undefined;
  readonly "--forge-resource-planner-capacity-conflict-surface"?:
    string | undefined;
  readonly "--forge-resource-planner-capacity-font-size"?: string | undefined;
  readonly "--forge-resource-planner-capacity-unavailable-surface"?:
    string | undefined;
  readonly "--forge-resource-planner-container-border"?: string | undefined;
  readonly "--forge-resource-planner-container-border-width"?:
    string | undefined;
  readonly "--forge-resource-planner-container-gap"?: string | undefined;
  readonly "--forge-resource-planner-container-padding"?: string | undefined;
  readonly "--forge-resource-planner-container-radius"?: string | undefined;
  readonly "--forge-resource-planner-container-surface"?: string | undefined;
  readonly "--forge-resource-planner-control-border"?: string | undefined;
  readonly "--forge-resource-planner-control-border-width"?: string | undefined;
  readonly "--forge-resource-planner-control-padding-block"?:
    string | undefined;
  readonly "--forge-resource-planner-control-padding-inline"?:
    string | undefined;
  readonly "--forge-resource-planner-control-radius"?: string | undefined;
  readonly "--forge-resource-planner-control-selected-surface"?:
    string | undefined;
  readonly "--forge-resource-planner-control-selected-text"?:
    string | undefined;
  readonly "--forge-resource-planner-control-surface"?: string | undefined;
  readonly "--forge-resource-planner-control-text"?: string | undefined;
  readonly "--forge-resource-planner-current-time-surface"?: string | undefined;
  readonly "--forge-resource-planner-current-time-width"?: string | undefined;
  readonly "--forge-resource-planner-empty-text"?: string | undefined;
  readonly "--forge-resource-planner-header-border"?: string | undefined;
  readonly "--forge-resource-planner-header-border-width"?: string | undefined;
  readonly "--forge-resource-planner-header-surface"?: string | undefined;
  readonly "--forge-resource-planner-resource-border"?: string | undefined;
  readonly "--forge-resource-planner-resource-border-width"?:
    string | undefined;
  readonly "--forge-resource-planner-resource-gap"?: string | undefined;
  readonly "--forge-resource-planner-resource-heading-weight"?:
    string | undefined;
  readonly "--forge-resource-planner-resource-padding"?: string | undefined;
  readonly "--forge-resource-planner-resource-secondary-text"?:
    string | undefined;
  readonly "--forge-resource-planner-resource-surface"?: string | undefined;
  readonly "--forge-resource-planner-row-border"?: string | undefined;
  readonly "--forge-resource-planner-row-border-width"?: string | undefined;
  readonly "--forge-resource-planner-selection-border"?: string | undefined;
  readonly "--forge-resource-planner-selection-border-style"?:
    string | undefined;
  readonly "--forge-resource-planner-selection-border-width"?:
    string | undefined;
  readonly "--forge-resource-planner-selection-height-inset"?:
    string | undefined;
  readonly "--forge-resource-planner-selection-surface"?: string | undefined;
  readonly "--forge-resource-planner-timeline-border"?: string | undefined;
  readonly "--forge-resource-planner-timeline-border-width"?:
    string | undefined;
  readonly "--forge-resource-planner-timeline-header-font-size"?:
    string | undefined;
  readonly "--forge-resource-planner-timeline-header-padding"?:
    string | undefined;
  readonly "--forge-resource-planner-timeline-header-text"?: string | undefined;
  readonly "--forge-resource-planner-timeline-selected-ring"?:
    string | undefined;
  readonly "--forge-resource-planner-toolbar-gap"?: string | undefined;
  readonly "--forge-resource-planner-viewport-border"?: string | undefined;
  readonly "--forge-resource-planner-viewport-border-width"?:
    string | undefined;
};

function createResourcePlannerStyle(
  properties: Readonly<ResourcePlannerStyleProperties> | undefined,
): ResourcePlannerStyle | undefined {
  return createForgeStyle({
    "--forge-resource-planner-booking-conflict-surface":
      properties?.["booking-conflict-surface"],
    "--forge-resource-planner-booking-focus-ring":
      properties?.["booking-focus-ring"],
    "--forge-resource-planner-booking-height-inset":
      properties?.["booking-height-inset"],
    "--forge-resource-planner-booking-padding-block":
      properties?.["booking-padding-block"],
    "--forge-resource-planner-booking-padding-inline":
      properties?.["booking-padding-inline"],
    "--forge-resource-planner-booking-radius": properties?.["booking-radius"],
    "--forge-resource-planner-booking-surface": properties?.["booking-surface"],
    "--forge-resource-planner-booking-text": properties?.["booking-text"],
    "--forge-resource-planner-capacity-border": properties?.["capacity-border"],
    "--forge-resource-planner-capacity-border-width":
      properties?.["capacity-border-width"],
    "--forge-resource-planner-capacity-conflict-surface":
      properties?.["capacity-conflict-surface"],
    "--forge-resource-planner-capacity-font-size":
      properties?.["capacity-font-size"],
    "--forge-resource-planner-capacity-unavailable-surface":
      properties?.["capacity-unavailable-surface"],
    "--forge-resource-planner-container-border":
      properties?.["container-border"],
    "--forge-resource-planner-container-border-width":
      properties?.["container-border-width"],
    "--forge-resource-planner-container-gap": properties?.["container-gap"],
    "--forge-resource-planner-container-padding":
      properties?.["container-padding"],
    "--forge-resource-planner-container-radius":
      properties?.["container-radius"],
    "--forge-resource-planner-container-surface":
      properties?.["container-surface"],
    "--forge-resource-planner-control-border": properties?.["control-border"],
    "--forge-resource-planner-control-border-width":
      properties?.["control-border-width"],
    "--forge-resource-planner-control-padding-block":
      properties?.["control-padding-block"],
    "--forge-resource-planner-control-padding-inline":
      properties?.["control-padding-inline"],
    "--forge-resource-planner-control-radius": properties?.["control-radius"],
    "--forge-resource-planner-control-selected-surface":
      properties?.["control-selected-surface"],
    "--forge-resource-planner-control-selected-text":
      properties?.["control-selected-text"],
    "--forge-resource-planner-control-surface": properties?.["control-surface"],
    "--forge-resource-planner-control-text": properties?.["control-text"],
    "--forge-resource-planner-current-time-surface":
      properties?.["current-time-surface"],
    "--forge-resource-planner-current-time-width":
      properties?.["current-time-width"],
    "--forge-resource-planner-empty-text": properties?.["empty-text"],
    "--forge-resource-planner-header-border": properties?.["header-border"],
    "--forge-resource-planner-header-border-width":
      properties?.["header-border-width"],
    "--forge-resource-planner-header-surface": properties?.["header-surface"],
    "--forge-resource-planner-resource-border": properties?.["resource-border"],
    "--forge-resource-planner-resource-border-width":
      properties?.["resource-border-width"],
    "--forge-resource-planner-resource-gap": properties?.["resource-gap"],
    "--forge-resource-planner-resource-heading-weight":
      properties?.["resource-heading-weight"],
    "--forge-resource-planner-resource-padding":
      properties?.["resource-padding"],
    "--forge-resource-planner-resource-secondary-text":
      properties?.["resource-secondary-text"],
    "--forge-resource-planner-resource-surface":
      properties?.["resource-surface"],
    "--forge-resource-planner-row-border": properties?.["row-border"],
    "--forge-resource-planner-row-border-width":
      properties?.["row-border-width"],
    "--forge-resource-planner-selection-border":
      properties?.["selection-border"],
    "--forge-resource-planner-selection-border-style":
      properties?.["selection-border-style"],
    "--forge-resource-planner-selection-border-width":
      properties?.["selection-border-width"],
    "--forge-resource-planner-selection-height-inset":
      properties?.["selection-height-inset"],
    "--forge-resource-planner-selection-surface":
      properties?.["selection-surface"],
    "--forge-resource-planner-timeline-border": properties?.["timeline-border"],
    "--forge-resource-planner-timeline-border-width":
      properties?.["timeline-border-width"],
    "--forge-resource-planner-timeline-header-font-size":
      properties?.["timeline-header-font-size"],
    "--forge-resource-planner-timeline-header-padding":
      properties?.["timeline-header-padding"],
    "--forge-resource-planner-timeline-header-text":
      properties?.["timeline-header-text"],
    "--forge-resource-planner-timeline-selected-ring":
      properties?.["timeline-selected-ring"],
    "--forge-resource-planner-toolbar-gap": properties?.["toolbar-gap"],
    "--forge-resource-planner-viewport-border": properties?.["viewport-border"],
    "--forge-resource-planner-viewport-border-width":
      properties?.["viewport-border-width"],
  }) as ResourcePlannerStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface ResourcePlannerProperties {
  /** The content the consumer fills the component’s slots with. */
  children?: MpChild | readonly MpChild[];
  resources: PlannerResource[];
  modelValue?: SchedulerEvent[];
  assignments?: PlannerAssignment[];
  availability?: AvailabilityInput;
  view?: PlannerScale;
  defaultView?: PlannerScale;
  anchor?: Date;
  weekStartsOn?: WeekStart;
  locale?: string;
  timezone?: string;
  rowHeight?: number;
  slotWidth?: number;
  overscan?: number;
  height?: number;
  onUpdateModelValue?: (events: SchedulerEvent[]) => void;
  onEventUpdate?: (
    eventId: string,
    patch: Partial<Pick<SchedulerEvent, "dtstart" | "dtend">>,
  ) => void;
  onEventClick?: (event: SchedulerEvent, resourceId: string) => void;
  onRangeSelect?: (selection: {
    resourceId: string;
    start: string;
    end: string;
  }) => void;
  onAssignmentUpdate?: (assignment: PlannerAssignmentUpdate) => void;
  onViewChange?: (view: PlannerScale) => void;
  onNavigate?: (anchor: Date) => void;
  resource?: MpRenderProperty<PlannerResourceScope>;
  booking?: MpRenderProperty<PlannerBookingScope>;
  capacity?: MpRenderProperty<PlannerCapacityScope>;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<ResourcePlannerStyleProperties>;
}

const SCALE_OPTIONS: ReadonlyArray<{ value: PlannerScale; label: string }> = [
  { value: "hour", label: "Hour" },
  { value: "day", label: "Day" },
  { value: "month", label: "Month" },
];

const RESOURCE_COLUMN_WIDTH = 192;
const HEADER_HEIGHT = 44;

type PlannerInteraction =
  | { kind: "select"; resourceId: string; startX: number }
  | {
      kind: "move" | "resize-start" | "resize-end";
      eventId: string;
      resourceId: string;
      startX: number;
    };

interface PlannerSelectionOverlay {
  resourceId: string;
  left: number;
  width: number;
}

function rangeFor(
  scale: PlannerScale,
  anchor: Date,
  weekStartsOn: WeekStart,
): { start: Date; end: Date } {
  if (scale === "hour") {
    const start = startOfDay(anchor);
    return { start, end: addDays(start, 1) };
  }
  if (scale === "day") {
    const start = startOfWeek(anchor, weekStartsOn);
    return { start, end: addDays(start, 7) };
  }
  const start = startOfMonth(anchor);
  return { start, end: addMonths(start, 1) };
}

function titleFor(
  scale: PlannerScale,
  range: { start: Date; end: Date },
  locale?: string,
): string {
  if (scale === "hour")
    return range.start.toLocaleDateString(locale, { dateStyle: "full" });
  if (scale === "month")
    return range.start.toLocaleDateString(locale, {
      month: "long",
      year: "numeric",
    });
  const end = new Date(range.end.getTime() - 1);
  return `${range.start.toLocaleDateString(locale, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric" })}`;
}

function resourceAvailability(
  resource: PlannerResource,
  availability: AvailabilityInput | undefined,
  range: { start: Date; end: Date },
  timezone?: string,
) {
  if (!availability) return [];
  return expandAvailability(resource.id, availability, range, {
    zone: timezone,
  });
}

function eventLabel(event: SchedulerEvent): string {
  return event.summary || "Untitled booking";
}

function pointerTimelineX(pointerX: number, viewport: HTMLElement): number {
  return (
    pointerX -
    viewport.getBoundingClientRect().left -
    RESOURCE_COLUMN_WIDTH +
    viewport.scrollLeft
  );
}

export function ForgeResourcePlanner(
  properties: Readonly<ResourcePlannerProperties>,
): MpElement {
  const style = createResourcePlannerStyle(properties.properties);

  const {
    resources,
    modelValue = [],
    assignments = [],
    availability,
    defaultView = "day",
    weekStartsOn = 0,
    locale,
    timezone,
    rowHeight = 72,
    slotWidth,
    overscan = 3,
    height = 560,
  } = properties;
  const [internalView, setInternalView] = useState<PlannerScale>(defaultView);
  const [internalAnchor, setInternalAnchor] = useState<Date>(
    startOfDay(new Date()),
  );
  const [scrollTop, setScrollTop] = useState(0);
  const [interaction, setInteraction] = useState<
    PlannerInteraction | undefined
  >(
    // eslint-disable-next-line unicorn/no-useless-undefined -- neutral useState requires an explicit initial value
    undefined,
  );
  const [selection, setSelection] = useState<
    PlannerSelectionOverlay | undefined
  >(
    // eslint-disable-next-line unicorn/no-useless-undefined -- neutral useState requires an explicit initial value
    undefined,
  );
  const [selectedResourceId, setSelectedResourceId] = useState<
    string | undefined
  >(resources[0]?.id);
  const effectiveView = properties.view ?? internalView;
  const effectiveAnchor = properties.anchor ?? internalAnchor;
  const range = rangeFor(effectiveView, effectiveAnchor, weekStartsOn);
  const segments = generateTimelineSegments(effectiveView, range, {
    locale,
    slotWidth,
    zone: timezone,
  });
  const timelineWidth = segments.reduce(
    (total, segment) => total + segment.width,
    0,
  );
  const records = normalizePlannerEvents(modelValue, assignments, range);
  const totalHeight = resources.length * rowHeight;
  const firstVisible = Math.max(
    0,
    Math.floor(scrollTop / rowHeight) - overscan,
  );
  const lastVisible = Math.min(
    resources.length,
    Math.ceil((scrollTop + height) / rowHeight) + overscan,
  );
  const visibleResources = resources.slice(firstVisible, lastVisible);
  const now = new Date();
  const currentTimeVisible =
    effectiveView !== "month" && now >= range.start && now < range.end;
  const currentTimePosition = timeToPosition(now, range, timelineWidth);

  const emitEventPatch = (
    eventId: string,
    patch: Partial<Pick<SchedulerEvent, "dtstart" | "dtend">>,
  ): void => {
    const nextEvents = modelValue.map((event) =>
      event.uid === eventId ? { ...event, ...patch } : event,
    );
    properties.onUpdateModelValue?.(nextEvents);
    properties.onEventUpdate?.(eventId, patch);
  };

  const resourceAtPointer = (
    pointerY: number,
    viewport: HTMLElement,
  ): PlannerResource | undefined => {
    const rowPosition =
      pointerY -
      viewport.getBoundingClientRect().top -
      HEADER_HEIGHT +
      viewport.scrollTop;
    const index = Math.floor(rowPosition / rowHeight);
    return index >= 0 && index < resources.length
      ? resources[index]
      : undefined;
  };

  const finishInteraction = (pointerEvent: PointerEvent): void => {
    if (!interaction) return;
    const viewport = pointerEvent.currentTarget as HTMLElement;
    const endX = pointerTimelineX(pointerEvent.clientX, viewport);
    if (interaction.kind === "select") {
      const start = positionToTime(
        Math.min(interaction.startX, endX),
        range,
        timelineWidth,
      );
      const endPosition = Math.max(interaction.startX, endX);
      const end =
        endPosition - Math.min(interaction.startX, endX) < 2
          ? new Date(
              start.getTime() +
                (effectiveView === "month" ? 86_400_000 : 3_600_000),
            )
          : positionToTime(endPosition, range, timelineWidth);
      const target = resourceAtPointer(pointerEvent.clientY, viewport);
      const selected = selectPlannerRange(
        target?.id ?? interaction.resourceId,
        start,
        end,
      );
      if (selected) {
        properties.onRangeSelect?.(selected);
        setSelection({
          resourceId: selected.resourceId,
          left: timeToPosition(new Date(selected.start), range, timelineWidth),
          width:
            timeToPosition(new Date(selected.end), range, timelineWidth) -
            timeToPosition(new Date(selected.start), range, timelineWidth),
        });
      }
    } else {
      const event = modelValue.find(
        (candidate) => candidate.uid === interaction.eventId,
      );
      if (event) {
        const deltaMs =
          Math.round(
            (((endX - interaction.startX) / timelineWidth) *
              (range.end.getTime() - range.start.getTime())) /
              (15 * 60_000),
          ) *
          (15 * 60_000);
        const patch =
          interaction.kind === "move"
            ? movePlannerEventPatch(event, deltaMs, { boundary: range })
            : resizePlannerEventPatch(
                event,
                deltaMs,
                interaction.kind === "resize-start" ? "start" : "end",
                { boundary: range },
              );
        if (Object.keys(patch).length > 0) emitEventPatch(event.uid, patch);
        const target = resourceAtPointer(pointerEvent.clientY, viewport);
        if (target && target.id !== interaction.resourceId) {
          properties.onAssignmentUpdate?.(
            reassignPlannerEvent(event.uid, target.id),
          );
        }
      }
    }
    setInteraction(undefined);
  };

  const startSelection = (
    resourceId: string,
    pointerEvent: PointerEvent,
  ): void => {
    const viewport = pointerEvent.currentTarget as HTMLElement;
    setSelection(undefined);
    setInteraction({
      kind: "select",
      resourceId,
      startX: pointerTimelineX(pointerEvent.clientX, viewport),
    });
    setSelectedResourceId(resourceId);
  };

  const navigate = (direction: -1 | 1): void => {
    const next = stepAnchor(
      effectiveView === "month"
        ? "month"
        : effectiveView === "day"
          ? "week"
          : "day",
      effectiveAnchor,
      direction,
    );
    setInternalAnchor(next);
    properties.onNavigate?.(next);
  };

  const goToday = (): void => {
    const next = startOfDay(new Date());
    setInternalAnchor(next);
    properties.onNavigate?.(next);
  };

  const changeView = (next: PlannerScale): void => {
    setInternalView(next);
    properties.onViewChange?.(next);
  };

  const renderCapacity = (
    resource: PlannerResource,
    segment: TimelineSegment,
  ): MpElement => {
    const state = calculateCapacityState(
      resource.id,
      segment,
      resourceAvailability(resource, availability, range, timezone),
      records,
    );
    return (
      <div
        className={styles["forge-resource-planner__capacity-cell"]}
        data-status={state.status}
        style={{ width: `${segment.width}px` }}
      >
        <Slot
          name="capacity"
          resource={resource}
          segment={segment}
          state={state}
        >
          {state.status === "unavailable"
            ? "Unavailable"
            : `${Math.max(0, Math.round(state.remainingCapacityUnits * 10) / 10)} open`}
        </Slot>
      </div>
    );
  };

  const renderBooking = (
    resource: PlannerResource,
    geometry: PlannerEventGeometry,
  ): MpElement => (
    <button
      type="button"
      className={styles["forge-resource-planner__booking"]}
      data-conflict={geometry.totalColumns > 1}
      style={{
        left: `${geometry.left + (geometry.width / geometry.totalColumns) * geometry.column}px`,
        width: `${Math.max(32, geometry.width / geometry.totalColumns - 4)}px`,
      }}
      title={eventLabel(geometry.event)}
      aria-label={`${eventLabel(geometry.event)} for ${resource.label}`}
      onPointerDown={(pointerEvent: PointerEvent) => {
        pointerEvent.stopPropagation();
        pointerEvent.preventDefault();
        const viewport = (
          pointerEvent.currentTarget as HTMLElement | null
        )?.closest(
          `.${styles["forge-resource-planner__viewport"]}`,
        ) as HTMLElement | null;
        if (viewport) {
          setInteraction({
            kind: "move",
            eventId: geometry.event.uid,
            resourceId: resource.id,
            startX: pointerTimelineX(pointerEvent.clientX, viewport),
          });
        }
      }}
      onKeyDown={(keyboardEvent: KeyboardEvent) => {
        if (
          keyboardEvent.key !== "ArrowLeft" &&
          keyboardEvent.key !== "ArrowRight"
        )
          return;
        keyboardEvent.preventDefault();
        const delta =
          keyboardEvent.key === "ArrowLeft" ? -15 * 60_000 : 15 * 60_000;
        const patch = keyboardEvent.shiftKey
          ? resizePlannerEventPatch(geometry.event, delta, "end", {
              boundary: range,
            })
          : movePlannerEventPatch(geometry.event, delta, { boundary: range });
        emitEventPatch(geometry.event.uid, patch);
      }}
      onClick={(clickEvent: MouseEvent) => {
        clickEvent.stopPropagation();
        properties.onEventClick?.(geometry.event, resource.id);
      }}
    >
      <span
        className={styles["forge-resource-planner__resize-start"]}
        aria-hidden="true"
        onPointerDown={(pointerEvent: PointerEvent) => {
          pointerEvent.stopPropagation();
          pointerEvent.preventDefault();
          const viewport = (
            pointerEvent.currentTarget as HTMLElement | null
          )?.closest(
            `.${styles["forge-resource-planner__viewport"]}`,
          ) as HTMLElement | null;
          if (viewport) {
            setInteraction({
              kind: "resize-start",
              eventId: geometry.event.uid,
              resourceId: resource.id,
              startX: pointerTimelineX(pointerEvent.clientX, viewport),
            });
          }
        }}
      />
      <Slot
        name="booking"
        event={geometry.event}
        resource={resource}
        geometry={geometry}
      >
        <span>{eventLabel(geometry.event)}</span>
      </Slot>
      <span
        className={styles["forge-resource-planner__resize-end"]}
        aria-hidden="true"
        onPointerDown={(pointerEvent: PointerEvent) => {
          pointerEvent.stopPropagation();
          pointerEvent.preventDefault();
          const viewport = (
            pointerEvent.currentTarget as HTMLElement | null
          )?.closest(
            `.${styles["forge-resource-planner__viewport"]}`,
          ) as HTMLElement | null;
          if (viewport) {
            setInteraction({
              kind: "resize-end",
              eventId: geometry.event.uid,
              resourceId: resource.id,
              startX: pointerTimelineX(pointerEvent.clientX, viewport),
            });
          }
        }}
      />
    </button>
  );

  return (
    <section
      className={styles["forge-resource-planner"]}
      aria-label="Resource planner"
      style={style}
    >
      <div className={styles["forge-resource-planner__toolbar"]}>
        <div className={styles["forge-resource-planner__navigation"]}>
          <button type="button" onClick={goToday}>
            Today
          </button>
          <button
            type="button"
            aria-label="Previous range"
            onClick={() => navigate(-1)}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next range"
            onClick={() => navigate(1)}
          >
            ›
          </button>
          <strong>{titleFor(effectiveView, range, locale)}</strong>
        </div>
        <div
          className={styles["forge-resource-planner__view-switcher"]}
          role="group"
          aria-label="Timeline scale"
        >
          {SCALE_OPTIONS.map((option) => (
            <button
              type="button"
              key={option.value}
              aria-pressed={effectiveView === option.value}
              onClick={() => changeView(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <div
        className={styles["forge-resource-planner__viewport"]}
        style={{ height: `${height}px` }}
        role="grid"
        aria-rowcount={resources.length + 1}
        onScroll={(scrollEvent: Event) =>
          setScrollTop((scrollEvent.currentTarget as HTMLElement).scrollTop)
        }
        onPointerUp={finishInteraction}
        onPointerCancel={() => setInteraction(undefined)}
      >
        <div
          className={styles["forge-resource-planner__header"]}
          style={{ "--timeline-width": `${timelineWidth}px` }}
        >
          <div className={styles["forge-resource-planner__resource-header"]}>
            Resource
          </div>
          <div className={styles["forge-resource-planner__timeline-header"]}>
            {segments.map((segment) => (
              <div
                key={`${segment.start.toISOString()}-${segment.index}`}
                style={{ width: `${segment.width}px` }}
              >
                {segment.label}
              </div>
            ))}
          </div>
        </div>
        <div
          className={styles["forge-resource-planner__rows"]}
          style={{
            height: `${totalHeight}px`,
            "--resource-row-height": `${rowHeight}px`,
            "--timeline-width": `${timelineWidth}px`,
            "--slot-width": `${segments[0]?.width ?? 144}px`,
          }}
        >
          <div style={{ height: `${firstVisible * rowHeight}px` }} />
          {visibleResources.map((resource, visibleIndex) => {
            const resourceRecords = records.filter(
              (record) => record.resourceId === resource.id,
            );
            const geometry = layoutResourceEvents(
              resourceRecords,
              range,
              timelineWidth,
            );
            const top = (firstVisible + visibleIndex) * rowHeight;
            return (
              <div
                key={resource.id}
                className={styles["forge-resource-planner__row"]}
                style={{ top: `${top}px` }}
                role="row"
                aria-rowindex={firstVisible + visibleIndex + 2}
              >
                <div
                  className={styles["forge-resource-planner__resource"]}
                  role="rowheader"
                  onClick={() => setSelectedResourceId(resource.id)}
                >
                  <Slot name="resource" resource={resource}>
                    <strong>{resource.label}</strong>
                    {resource.subtitle ? (
                      <small>{resource.subtitle}</small>
                    ) : undefined}
                  </Slot>
                </div>
                <div
                  className={styles["forge-resource-planner__timeline"]}
                  role="gridcell"
                  data-selected={selectedResourceId === resource.id}
                  tabIndex={0}
                  onPointerDown={(pointerEvent: PointerEvent) =>
                    startSelection(resource.id, pointerEvent)
                  }
                  onKeyDown={(keyboardEvent: KeyboardEvent) => {
                    if (keyboardEvent.key !== "Enter") return;
                    keyboardEvent.preventDefault();
                    const selected = selectPlannerRange(
                      resource.id,
                      segments[0]?.start ?? range.start,
                      segments[0]?.end ??
                        new Date(range.start.getTime() + 3_600_000),
                    );
                    if (selected) properties.onRangeSelect?.(selected);
                  }}
                >
                  {segments.map((segment) => renderCapacity(resource, segment))}
                  {geometry.map((entry) => renderBooking(resource, entry))}
                  {selection?.resourceId === resource.id ? (
                    <div
                      className={styles["forge-resource-planner__selection"]}
                      style={{
                        left: `${selection.left}px`,
                        width: `${selection.width}px`,
                      }}
                      aria-hidden="true"
                    />
                  ) : undefined}
                  {currentTimeVisible ? (
                    <div
                      className={styles["forge-resource-planner__current-time"]}
                      style={{ left: `${currentTimePosition}px` }}
                      aria-hidden="true"
                    />
                  ) : undefined}
                </div>
              </div>
            );
          })}
          <div
            style={{
              height: `${(resources.length - lastVisible) * rowHeight}px`,
            }}
          />
        </div>
      </div>
      {resources.length === 0 ? (
        <p className={styles["forge-resource-planner__empty"]}>
          No resources available.
        </p>
      ) : undefined}
    </section>
  );
}
