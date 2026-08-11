import {
  h,
  type MpChild,
  type MpElement,
  type MpRenderProperty,
  Slot,
  useState,
} from "@mission-platform/forge";
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
