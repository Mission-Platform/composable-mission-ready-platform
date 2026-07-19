import { IconChevron } from '@mission-platform/icons';
import { h, useState, type MpElement, type MpProperties } from '@mission-platform/jsx';
import {
  addDays,
  applyEventPatch,
  createEvent,
  eventsForDay,
  eventsForRange,
  formatDuration,
  layoutDay,
  moveEventPatch,
  resizeEventPatch,
  startOfDay,
  startOfWeek,
  stepAnchor,
  type SchedulerView,
  type VEvent,
  type WeekStart,
} from '@mission-platform/scheduler-core';

import { BaseButton } from '../base-button';
import { BaseDialog } from '../base-dialog';
import { BaseInput } from '../base-input';
import { BaseTextarea } from '../base-textarea';
import { BaseTypography } from '../base-typography';
import { beginPointerDrag } from '../pointer-drag';
import sizeStyles from '../size.module.scss';

import styles from './base-scheduler.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type SchedulerSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

// Re-export the shared event model + view type so consumers import the same
// names they used from the Vue component.
export type { SchedulerView, VEvent } from '@mission-platform/scheduler-core';

export interface SchedulerProperties extends MpProperties {
  /** Size token controlling the scheduler's font scale. Defaults to `'md'`. */
  size?: SchedulerSize;
  /**
   * The RFC 5545 events (controlled via `modelValue`).
   * @model onUpdateModelValue
   */
  modelValue?: VEvent[];
  /** Initially active view. Defaults to `'week'`. */
  defaultView?: SchedulerView;
  /** Day the week starts on (0 = Sunday … 6 = Saturday). Defaults to `0`. */
  weekStartsOn?: WeekStart;
  /** Fired whenever the event list changes (CRUD or drag/resize). */
  onUpdateModelValue?: (events: VEvent[]) => void;
  /** Fired when the user clicks an event chip. */
  onEventClick?: (event: VEvent) => void;
}

/** The five calendar views, in toolbar order. */
const VIEWS: ReadonlyArray<{ id: SchedulerView; label: string }> = [
  { id: 'day', label: 'Day' },
  { id: 'three-day', label: '3 Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
];

/** Pixel height of one hour row in the time grid (mirrors the Vue SFC). */
const HOUR_HEIGHT = 60;
const HOURS = Array.from({ length: 24 }, (_, index) => index);
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** A working draft for the create/edit event dialog. */
interface EventDraft {
  uid?: string;
  summary: string;
  start: string;
  end: string;
  location: string;
  description: string;
  color: string;
}

/** Local-time ISO `YYYY-MM-DD` for a Date. */
function isoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** `YYYY-MM-DDTHH:mm` for a datetime-local input. */
function isoDateTime(date: Date): string {
  return `${isoDate(date)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** Minutes-of-day for an ISO datetime string. */
function dateToMinutes(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

/** Format the hour-gutter label, e.g. `9 AM`. */
function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

/** `HH:MM` time label for an event chip. */
function timeLabel(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Parse a `#rgb` / `#rrggbb` / `rgb(r, g, b)` color into `[r, g, b]`, or `undefined`. */
function parseColor(color: string): [number, number, number] | undefined {
  const hex = color.trim().match(/^#([\da-f]{3}|[\da-f]{6})$/i);
  if (hex) {
    const value = hex[1];
    const full = value.length === 3 ? [...value].map((char) => char + char).join('') : value;
    return [
      Number.parseInt(full.slice(0, 2), 16),
      Number.parseInt(full.slice(2, 4), 16),
      Number.parseInt(full.slice(4, 6), 16),
    ];
  }
  const rgb = color.trim().match(/^rgba?\(\s*(\d+)\D+(\d+)\D+(\d+)/i);
  if (rgb) {
    return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  }
  return undefined;
}

/**
 * A readable foreground (`#0b0b0f` or `#ffffff`) for text laid over `background`,
 * chosen by WCAG relative luminance so an event chip's label always meets the
 * contrast threshold regardless of the (user-supplied) event colour. Returns
 * `undefined` when `background` is absent or unparseable, so the CSS default
 * (dark text on the subtle chip tint) applies.
 */
function readableTextColor(background: string | undefined): string | undefined {
  if (!background) {
    return undefined;
  }
  const rgb = parseColor(background);
  if (!rgb) {
    return undefined;
  }
  const [r, g, b] = rgb.map((channel) => {
    const s = channel / 255;
    return s <= 0.039_28 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // Contrast vs white is (1.05)/(L+0.05); vs near-black is (L+0.05)/0.05. Pick the
  // higher-contrast option — light text on darker fills, dark text on lighter ones.
  return luminance > 0.179 ? '#0b0b0f' : '#ffffff';
}

/**
 * `BaseScheduler` — a full calendar/scheduler authored once in the neutral JSX
 * dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-jsx`.
 *
 * At full parity with the Vue original: a toolbar (Today / prev-next / title /
 * new-event / five-view switcher) sits above the active view — a **time grid**
 * (day / 3-day / week) with hour rows and column-collision event placement, a
 * **month grid** (6×7), or a **year grid** (12 mini-months). Events are RFC 5545
 * {@link VEvent}s; all the heavy logic (recurrence expansion, view ranges, the
 * collision layout, duration formatting) comes from the shared
 * `@mission-platform/scheduler-core`, so the Vue and JSX schedulers behave
 * identically (parity by construction). Time-grid events can be dragged to a new
 * time and resized via the co-located pointer-drag helper; an event dialog
 * (the migrated {@link BaseDialog}) creates / edits / deletes events.
 *
 * Substitutions from the Vue SFC: `@mission-platform/icons` chevrons become
 * `‹`/`›` glyphs; `vue-i18n`/labels are inline strings; `v-model` + the
 * `event-click` emit become the `onUpdateModelValue` / `onEventClick` callback
 * props.
 */
export function BaseScheduler(properties: Readonly<SchedulerProperties>): MpElement {
  const { modelValue = [], defaultView = 'week', weekStartsOn = 0, size = 'md' } = properties;

  const [events, setEvents] = useState<VEvent[]>(modelValue);
  const [view, setView] = useState<SchedulerView>(defaultView);
  const [anchor, setAnchor] = useState<Date>(startOfDay(new Date()));
  // eslint-disable-next-line unicorn/no-useless-undefined -- the neutral `useState` requires an explicit initial value
  const [draft, setDraft] = useState<EventDraft | undefined>(undefined);

  const commitEvents = (next: VEvent[]): void => {
    setEvents(next);
    properties.onUpdateModelValue?.(next);
  };

  // ── Navigation ───────────────────────────────────────────────────────────
  const goToday = (): void => setAnchor(startOfDay(new Date()));
  const goPrevious = (): void => setAnchor(stepAnchor(view, anchor, -1));
  const goNext = (): void => setAnchor(stepAnchor(view, anchor, 1));
  const switchView = (next: SchedulerView, date?: Date): void => {
    setView(next);
    if (date) setAnchor(startOfDay(date));
  };

  // ── Toolbar title ────────────────────────────────────────────────────────
  const toolbarTitle = ((): string => {
    if (view === 'day') {
      return anchor.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
    if (view === 'three-day') {
      const end = addDays(anchor, 2);
      return `${anchor.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    if (view === 'week') {
      const start = startOfWeek(anchor, weekStartsOn);
      const end = addDays(start, 6);
      return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    if (view === 'month') {
      return anchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    }
    return String(anchor.getFullYear());
  })();

  // ── Event dialog ───────────────────────────────────────────────────────────
  const openCreate = (start: string): void => {
    const startDate = new Date(start);
    const end = new Date(startDate.getTime() + 60 * 60 * 1000);
    setDraft({ summary: '', start, end: isoDateTime(end), location: '', description: '', color: '' });
  };

  const openEdit = (event: VEvent): void => {
    properties.onEventClick?.(event);
    setDraft({
      uid: event.masterUid ?? event.uid,
      summary: event.summary ?? '',
      start: event.dtstart.length > 10 ? event.dtstart.slice(0, 16) : `${event.dtstart}T00:00`,
      end: event.dtend.length > 10 ? event.dtend.slice(0, 16) : `${event.dtend}T00:00`,
      location: event.location ?? '',
      description: event.description ?? '',
      color: event.color ?? '',
    });
  };

  const patchDraft = (patch: Partial<EventDraft>): void => {
    if (draft) setDraft({ ...draft, ...patch });
  };

  const saveDraft = (): void => {
    if (!draft || !draft.start) return;
    const fields = {
      dtstart: `${draft.start}:00`,
      dtend: `${draft.end || draft.start}:00`,
      summary: draft.summary,
      location: draft.location || undefined,
      description: draft.description || undefined,
      color: draft.color || undefined,
    };
    if (draft.uid) {
      commitEvents(events.map((event) => (event.uid === draft.uid ? applyEventPatch(event, fields) : event)));
    } else {
      commitEvents([...events, createEvent(fields)]);
    }
    setDraft(undefined);
  };

  const deleteDraft = (): void => {
    if (draft?.uid) commitEvents(events.filter((event) => event.uid !== draft.uid));
    setDraft(undefined);
  };

  // ── Drag / resize on the time grid ──────────────────────────────────────────
  const moveByPixels = (uid: string, deltaY: number): void => {
    const minutes = Math.round(((deltaY / HOUR_HEIGHT) * 60) / 15) * 15;
    if (minutes === 0) return;
    const event = events.find((candidate) => candidate.uid === uid);
    if (!event) return;
    commitEvents(
      events.map((candidate) =>
        candidate.uid === uid ? applyEventPatch(candidate, moveEventPatch(candidate, minutes * 60 * 1000)) : candidate,
      ),
    );
  };

  const resizeByPixels = (uid: string, deltaY: number): void => {
    const minutes = Math.round(((deltaY / HOUR_HEIGHT) * 60) / 15) * 15;
    if (minutes === 0) return;
    const event = events.find((candidate) => candidate.uid === uid);
    if (!event) return;
    commitEvents(
      events.map((candidate) =>
        candidate.uid === uid
          ? applyEventPatch(candidate, resizeEventPatch(candidate, minutes * 60 * 1000))
          : candidate,
      ),
    );
  };

  const startMove =
    (uid: string) =>
    (downEvent: PointerEvent): void => {
      downEvent.stopPropagation();
      const startY = downEvent.clientY;
      beginPointerDrag({
        onMove: () => {},
        onEnd: (upEvent) => moveByPixels(uid, upEvent.clientY - startY),
      });
    };

  const startResize =
    (uid: string) =>
    (downEvent: PointerEvent): void => {
      downEvent.stopPropagation();
      const startY = downEvent.clientY;
      beginPointerDrag({
        onMove: () => {},
        onEnd: (upEvent) => resizeByPixels(uid, upEvent.clientY - startY),
      });
    };

  // ── Render: time grid (day / three-day / week) ───────────────────────────────
  const renderTimeGrid = (): MpElement => {
    const dayCount = view === 'day' ? 1 : view === 'three-day' ? 3 : 7;
    const start = view === 'week' ? startOfWeek(anchor, weekStartsOn) : startOfDay(anchor);
    const days = Array.from({ length: dayCount }, (_, index) => addDays(start, index));
    const todayIso = isoDate(new Date());

    return (
      <div classNames={styles['base-scheduler__time-grid']}>
        <div
          classNames={styles['base-scheduler__grid-header']}
          style={{ gridTemplateColumns: `4rem repeat(${dayCount}, minmax(0, 1fr))` }}
        >
          <div classNames={styles['base-scheduler__gutter-corner']} />
          {days.map((day) => (
            <button
              key={isoDate(day)}
              classNames={[
                styles['base-scheduler__day-heading'],
                {
                  [styles['base-scheduler__day-heading--today']]: isoDate(day) === todayIso,
                },
              ]}
              type="button"
              onClick={() => switchView('day', day)}
            >
              <span classNames={styles['base-scheduler__day-weekday']}>
                {day.toLocaleDateString(undefined, { weekday: 'short' })}
              </span>
              <span classNames={styles['base-scheduler__day-number']}>{day.getDate()}</span>
            </button>
          ))}
        </div>

        <div
          classNames={styles['base-scheduler__grid-body']}
          style={{ gridTemplateColumns: `4rem repeat(${dayCount}, minmax(0, 1fr))` }}
        >
          <div classNames={styles['base-scheduler__hours']}>
            {HOURS.map((hour) => (
              <div
                key={hour}
                classNames={styles['base-scheduler__hour-label']}
                style={{ height: `${HOUR_HEIGHT}px` }}
              >
                {formatHour(hour)}
              </div>
            ))}
          </div>

          {days.map((day) => {
            const dayIso = isoDate(day);
            const slots = layoutDay(eventsForDay(events, day));
            return (
              <div
                key={dayIso}
                classNames={styles['base-scheduler__day-column']}
                data-scheduler-day={dayIso}
                style={{ height: `${HOUR_HEIGHT * 24}px` }}
                onClick={(clickEvent: MouseEvent) => {
                  const target = clickEvent.currentTarget as HTMLElement;
                  const relativeY = clickEvent.clientY - target.getBoundingClientRect().top;
                  const totalMinutes = Math.max(0, Math.round((relativeY / HOUR_HEIGHT) * 60));
                  const hh = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
                  const mm = String(totalMinutes % 60).padStart(2, '0');
                  openCreate(`${dayIso}T${hh}:${mm}`);
                }}
              >
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    classNames={styles['base-scheduler__hour-line']}
                    style={{ height: `${HOUR_HEIGHT}px` }}
                  />
                ))}
                {slots.map(({ event, column, totalColumns }) => {
                  const startMinutes = dateToMinutes(event.dtstart);
                  const durationMinutes = Math.max(
                    (new Date(event.dtend).getTime() - new Date(event.dtstart).getTime()) / 60_000,
                    15,
                  );
                  return (
                    <div
                      key={event.recurrenceId ?? event.uid}
                      classNames={styles['base-scheduler__event']}
                      role="button"
                      style={{
                        top: `${(startMinutes / 60) * HOUR_HEIGHT}px`,
                        height: `${(durationMinutes / 60) * HOUR_HEIGHT}px`,
                        left: `${(column / totalColumns) * 100}%`,
                        width: `${(1 / totalColumns) * 100}%`,
                        borderInlineStartColor: event.color || undefined,
                      }}
                      tabindex={0}
                      onClick={(clickEvent: MouseEvent) => {
                        clickEvent.stopPropagation();
                        openEdit(event);
                      }}
                      onPointerdown={startMove(event.masterUid ?? event.uid)}
                    >
                      <span classNames={styles['base-scheduler__event-time']}>{timeLabel(event.dtstart)}</span>
                      <span classNames={styles['base-scheduler__event-title']}>{event.summary || '(no title)'}</span>
                      <span classNames={styles['base-scheduler__event-duration']}>{formatDuration(event)}</span>
                      <span
                        aria-hidden="true"
                        classNames={styles['base-scheduler__event-resize']}
                        onPointerdown={startResize(event.masterUid ?? event.uid)}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Render: month grid ───────────────────────────────────────────────────────
  const renderMonth = (): MpElement => {
    const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const gridStart = startOfWeek(firstOfMonth, weekStartsOn);
    const cells = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
    const weekdayLabels = Array.from({ length: 7 }, (_, index) =>
      addDays(gridStart, index).toLocaleDateString(undefined, { weekday: 'short' }),
    );
    const todayIso = isoDate(new Date());

    return (
      <div classNames={styles['base-scheduler__month']}>
        <div classNames={styles['base-scheduler__month-weekdays']}>
          {weekdayLabels.map((label) => (
            <div
              key={label}
              classNames={styles['base-scheduler__month-weekday']}
            >
              {label}
            </div>
          ))}
        </div>
        <div classNames={styles['base-scheduler__month-grid']}>
          {cells.map((day) => {
            const dayIso = isoDate(day);
            const dayEvents = eventsForDay(events, day);
            const inMonth = day.getMonth() === anchor.getMonth();
            return (
              <div
                key={dayIso}
                classNames={[
                  styles['base-scheduler__month-cell'],
                  {
                    [styles['base-scheduler__month-cell--outside']]: !inMonth,
                    [styles['base-scheduler__month-cell--today']]: dayIso === todayIso,
                  },
                ]}
              >
                <button
                  aria-label={`Create event on ${dayIso}`}
                  classNames={styles['base-scheduler__month-cell-create']}
                  type="button"
                  onClick={() => openCreate(`${dayIso}T09:00`)}
                >
                  <span classNames={styles['base-scheduler__month-day-number']}>{day.getDate()}</span>
                </button>
                <span classNames={styles['base-scheduler__month-events']}>
                  {dayEvents.slice(0, 3).map((event) => (
                    <span
                      key={event.recurrenceId ?? event.uid}
                      classNames={styles['base-scheduler__month-chip']}
                      role="button"
                      style={{ backgroundColor: event.color || undefined, color: readableTextColor(event.color) }}
                      tabindex={0}
                      onClick={(clickEvent: MouseEvent) => {
                        clickEvent.stopPropagation();
                        openEdit(event);
                      }}
                    >
                      {event.summary || '(no title)'}
                    </span>
                  ))}
                  {dayEvents.length > 3 ? (
                    <span
                      classNames={styles['base-scheduler__month-more']}
                      role="button"
                      tabindex={0}
                      onClick={(clickEvent: MouseEvent) => {
                        clickEvent.stopPropagation();
                        switchView('day', day);
                      }}
                    >
                      +{dayEvents.length - 3} more
                    </span>
                  ) : undefined}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Render: year grid (12 mini-months) ──────────────────────────────────────
  const renderYear = (): MpElement => {
    const year = anchor.getFullYear();
    const yearEvents = eventsForRange(events, new Date(year, 0, 1), new Date(year + 1, 0, 1));
    const busyDays = new Set(yearEvents.map((event) => isoDate(new Date(event.dtstart))));
    const todayIso = isoDate(new Date());

    return (
      <div classNames={styles['base-scheduler__year']}>
        {MONTH_NAMES.map((monthName, monthIndex) => {
          const firstOfMonth = new Date(year, monthIndex, 1);
          const gridStart = startOfWeek(firstOfMonth, weekStartsOn);
          const cells = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
          return (
            <button
              key={monthName}
              classNames={styles['base-scheduler__mini-month']}
              type="button"
              onClick={() => switchView('month', firstOfMonth)}
            >
              <span classNames={styles['base-scheduler__mini-title']}>{monthName}</span>
              <span
                aria-hidden="true"
                classNames={styles['base-scheduler__mini-grid']}
              >
                {cells.map((day) => {
                  const dayIso = isoDate(day);
                  return (
                    <span
                      key={dayIso}
                      classNames={[
                        styles['base-scheduler__mini-day'],
                        {
                          [styles['base-scheduler__mini-day--outside']]: day.getMonth() !== monthIndex,
                          [styles['base-scheduler__mini-day--busy']]: busyDays.has(dayIso),
                          [styles['base-scheduler__mini-day--today']]: dayIso === todayIso,
                        },
                      ]}
                    >
                      {day.getDate()}
                    </span>
                  );
                })}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  const renderBody = (): MpElement => {
    if (view === 'month') return renderMonth();
    if (view === 'year') return renderYear();
    return renderTimeGrid();
  };

  return (
    <div classNames={[styles['base-scheduler'], sizeStyles[`base-size--${size}`]]}>
      <div classNames={styles['base-scheduler__toolbar']}>
        <BaseButton
          size="sm"
          variant="secondary"
          onClick={goToday}
        >
          Today
        </BaseButton>
        <div classNames={styles['base-scheduler__nav']}>
          <BaseButton
            aria-label="Previous"
            size="sm"
            variant="tertiary"
            onClick={goPrevious}
          >
            <IconChevron
              direction="left"
              size="sm"
            />
          </BaseButton>
          <BaseButton
            aria-label="Next"
            size="sm"
            variant="tertiary"
            onClick={goNext}
          >
            <IconChevron
              direction="right"
              size="sm"
            />
          </BaseButton>
        </div>
        <BaseTypography
          as="h2"
          classNames={styles['base-scheduler__title']}
          variant="h5"
        >
          {toolbarTitle}
        </BaseTypography>
        <div classNames={styles['base-scheduler__spacer']} />
        <BaseButton
          size="sm"
          variant="primary"
          onClick={() => openCreate(`${isoDate(anchor)}T09:00`)}
        >
          + New Event
        </BaseButton>
        <div
          aria-label="Calendar view"
          classNames={styles['base-scheduler__view-switcher']}
          role="group"
        >
          {VIEWS.map((option) => (
            <BaseButton
              key={option.id}
              aria-pressed={view === option.id}
              classNames={styles['base-scheduler__view-btn']}
              size="sm"
              variant={view === option.id ? 'primary' : 'tertiary'}
              onClick={() => switchView(option.id)}
            >
              {option.label}
            </BaseButton>
          ))}
        </div>
      </div>

      <div
        aria-label={`${view} view`}
        classNames={styles['base-scheduler__body']}
        data-view={view}
      >
        {renderBody()}
      </div>

      <BaseDialog
        open={draft !== undefined}
        title={draft?.uid ? 'Edit event' : 'New event'}
        onClose={() => setDraft(undefined)}
        onUpdateOpen={(open: boolean) => {
          if (!open) setDraft(undefined);
        }}
      >
        {draft ? (
          <div classNames={styles['base-scheduler__form']}>
            <BaseInput
              label="Title"
              modelValue={draft.summary}
              placeholder="Event title"
              onUpdateModelValue={(value: string | number) => patchDraft({ summary: String(value) })}
            />
            <div classNames={styles['base-scheduler__form-row']}>
              <BaseInput
                hint="YYYY-MM-DDTHH:MM"
                label="Start"
                modelValue={draft.start}
                onUpdateModelValue={(value: string | number) => patchDraft({ start: String(value) })}
              />
              <BaseInput
                hint="YYYY-MM-DDTHH:MM"
                label="End"
                modelValue={draft.end}
                onUpdateModelValue={(value: string | number) => patchDraft({ end: String(value) })}
              />
            </div>
            <BaseInput
              label="Location"
              modelValue={draft.location}
              onUpdateModelValue={(value: string | number) => patchDraft({ location: String(value) })}
            />
            <BaseTextarea
              label="Description"
              modelValue={draft.description}
              rows={3}
              onUpdateModelValue={(value: string) => patchDraft({ description: value })}
            />
            <div classNames={styles['base-scheduler__form-actions']}>
              {draft.uid ? (
                <BaseButton
                  type="button"
                  variant="secondary"
                  onClick={deleteDraft}
                >
                  Delete
                </BaseButton>
              ) : undefined}
              <div classNames={styles['base-scheduler__spacer']} />
              <BaseButton
                type="button"
                variant="secondary"
                onClick={() => setDraft(undefined)}
              >
                Cancel
              </BaseButton>
              <BaseButton
                type="button"
                variant="primary"
                onClick={saveDraft}
              >
                Save
              </BaseButton>
            </div>
          </div>
        ) : undefined}
      </BaseDialog>
    </div>
  );
}
