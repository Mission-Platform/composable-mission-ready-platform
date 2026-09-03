import {
  useEffect,
  useMemo,
  useState,
  createForgeStyle,
  type MpChild,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge';
import { ForgeIconChevron } from '@mission-platform/icons';
import { ForgeTypography } from '@mission-platform/typography';
import { DateTime } from 'luxon';

import styles from './forge-calendar.module.scss';

/** Visual size of the calendar, matching the shared size scale. */
export type CalendarSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface CalendarStyleProperties {
  readonly 'border-default'?: string;
  readonly 'border-focus'?: string;
  readonly 'border-focus-width'?: string;
  readonly 'border-width'?: string;
  readonly 'disabled-opacity'?: string;
  readonly 'font-weight-medium'?: string;
  readonly 'font-weight-selected'?: string;
  readonly 'header-gap'?: string;
  readonly 'label-gap'?: string;
  readonly 'label-padding-block'?: string;
  readonly 'label-padding-inline'?: string;
  readonly 'outside-opacity'?: string;
  readonly 'preview-end-opacity'?: string;
  readonly 'preview-opacity'?: string;
  readonly 'radius-control'?: string;
  readonly 'radius-default'?: string;
  readonly 'range-opacity'?: string;
  readonly shadow?: string;
  readonly 'size-2xl-cell-height'?: string;
  readonly 'size-2xl-font-size'?: string;
  readonly 'size-2xl-padding'?: string;
  readonly 'size-2xs-cell-height'?: string;
  readonly 'size-2xs-font-size'?: string;
  readonly 'size-2xs-padding'?: string;
  readonly 'size-lg-cell-height'?: string;
  readonly 'size-lg-font-size'?: string;
  readonly 'size-lg-padding'?: string;
  readonly 'size-md-cell-height'?: string;
  readonly 'size-md-font-size'?: string;
  readonly 'size-md-padding'?: string;
  readonly 'size-sm-cell-height'?: string;
  readonly 'size-sm-font-size'?: string;
  readonly 'size-sm-padding'?: string;
  readonly 'size-xl-cell-height'?: string;
  readonly 'size-xl-font-size'?: string;
  readonly 'size-xl-padding'?: string;
  readonly 'size-xs-cell-height'?: string;
  readonly 'size-xs-font-size'?: string;
  readonly 'size-xs-padding'?: string;
  readonly 'surface-default'?: string;
  readonly 'surface-hover'?: string;
  readonly 'surface-range'?: string;
  readonly 'surface-selected'?: string;
  readonly 'text-default'?: string;
  readonly 'text-muted'?: string;
  readonly 'text-range'?: string;
  readonly 'text-secondary'?: string;
  readonly 'text-selected'?: string;
  readonly 'transition-duration'?: string;
  readonly 'transition-easing'?: string;
}

export type CalendarStyle = CSSStyleProperties & {
  readonly '--forge-calendar-border-default'?: string | undefined;
  readonly '--forge-calendar-border-focus'?: string | undefined;
  readonly '--forge-calendar-border-focus-width'?: string | undefined;
  readonly '--forge-calendar-border-width'?: string | undefined;
  readonly '--forge-calendar-disabled-opacity'?: string | undefined;
  readonly '--forge-calendar-font-weight-medium'?: string | undefined;
  readonly '--forge-calendar-font-weight-selected'?: string | undefined;
  readonly '--forge-calendar-header-gap'?: string | undefined;
  readonly '--forge-calendar-label-gap'?: string | undefined;
  readonly '--forge-calendar-label-padding-block'?: string | undefined;
  readonly '--forge-calendar-label-padding-inline'?: string | undefined;
  readonly '--forge-calendar-outside-opacity'?: string | undefined;
  readonly '--forge-calendar-preview-end-opacity'?: string | undefined;
  readonly '--forge-calendar-preview-opacity'?: string | undefined;
  readonly '--forge-calendar-radius-control'?: string | undefined;
  readonly '--forge-calendar-radius-default'?: string | undefined;
  readonly '--forge-calendar-range-opacity'?: string | undefined;
  readonly '--forge-calendar-shadow'?: string | undefined;
  readonly '--forge-calendar-size-2xl-cell-height'?: string | undefined;
  readonly '--forge-calendar-size-2xl-font-size'?: string | undefined;
  readonly '--forge-calendar-size-2xl-padding'?: string | undefined;
  readonly '--forge-calendar-size-2xs-cell-height'?: string | undefined;
  readonly '--forge-calendar-size-2xs-font-size'?: string | undefined;
  readonly '--forge-calendar-size-2xs-padding'?: string | undefined;
  readonly '--forge-calendar-size-lg-cell-height'?: string | undefined;
  readonly '--forge-calendar-size-lg-font-size'?: string | undefined;
  readonly '--forge-calendar-size-lg-padding'?: string | undefined;
  readonly '--forge-calendar-size-md-cell-height'?: string | undefined;
  readonly '--forge-calendar-size-md-font-size'?: string | undefined;
  readonly '--forge-calendar-size-md-padding'?: string | undefined;
  readonly '--forge-calendar-size-sm-cell-height'?: string | undefined;
  readonly '--forge-calendar-size-sm-font-size'?: string | undefined;
  readonly '--forge-calendar-size-sm-padding'?: string | undefined;
  readonly '--forge-calendar-size-xl-cell-height'?: string | undefined;
  readonly '--forge-calendar-size-xl-font-size'?: string | undefined;
  readonly '--forge-calendar-size-xl-padding'?: string | undefined;
  readonly '--forge-calendar-size-xs-cell-height'?: string | undefined;
  readonly '--forge-calendar-size-xs-font-size'?: string | undefined;
  readonly '--forge-calendar-size-xs-padding'?: string | undefined;
  readonly '--forge-calendar-surface-default'?: string | undefined;
  readonly '--forge-calendar-surface-hover'?: string | undefined;
  readonly '--forge-calendar-surface-range'?: string | undefined;
  readonly '--forge-calendar-surface-selected'?: string | undefined;
  readonly '--forge-calendar-text-default'?: string | undefined;
  readonly '--forge-calendar-text-muted'?: string | undefined;
  readonly '--forge-calendar-text-range'?: string | undefined;
  readonly '--forge-calendar-text-secondary'?: string | undefined;
  readonly '--forge-calendar-text-selected'?: string | undefined;
  readonly '--forge-calendar-transition-duration'?: string | undefined;
  readonly '--forge-calendar-transition-easing'?: string | undefined;
};

function createCalendarStyle(properties: Readonly<CalendarStyleProperties> | undefined): CalendarStyle | undefined {
  return createForgeStyle({
    '--forge-calendar-border-default': properties?.['border-default'],
    '--forge-calendar-border-focus': properties?.['border-focus'],
    '--forge-calendar-border-focus-width': properties?.['border-focus-width'],
    '--forge-calendar-border-width': properties?.['border-width'],
    '--forge-calendar-disabled-opacity': properties?.['disabled-opacity'],
    '--forge-calendar-font-weight-medium': properties?.['font-weight-medium'],
    '--forge-calendar-font-weight-selected': properties?.['font-weight-selected'],
    '--forge-calendar-header-gap': properties?.['header-gap'],
    '--forge-calendar-label-gap': properties?.['label-gap'],
    '--forge-calendar-label-padding-block': properties?.['label-padding-block'],
    '--forge-calendar-label-padding-inline': properties?.['label-padding-inline'],
    '--forge-calendar-outside-opacity': properties?.['outside-opacity'],
    '--forge-calendar-preview-end-opacity': properties?.['preview-end-opacity'],
    '--forge-calendar-preview-opacity': properties?.['preview-opacity'],
    '--forge-calendar-radius-control': properties?.['radius-control'],
    '--forge-calendar-radius-default': properties?.['radius-default'],
    '--forge-calendar-range-opacity': properties?.['range-opacity'],
    '--forge-calendar-shadow': properties?.['shadow'],
    '--forge-calendar-size-2xl-cell-height': properties?.['size-2xl-cell-height'],
    '--forge-calendar-size-2xl-font-size': properties?.['size-2xl-font-size'],
    '--forge-calendar-size-2xl-padding': properties?.['size-2xl-padding'],
    '--forge-calendar-size-2xs-cell-height': properties?.['size-2xs-cell-height'],
    '--forge-calendar-size-2xs-font-size': properties?.['size-2xs-font-size'],
    '--forge-calendar-size-2xs-padding': properties?.['size-2xs-padding'],
    '--forge-calendar-size-lg-cell-height': properties?.['size-lg-cell-height'],
    '--forge-calendar-size-lg-font-size': properties?.['size-lg-font-size'],
    '--forge-calendar-size-lg-padding': properties?.['size-lg-padding'],
    '--forge-calendar-size-md-cell-height': properties?.['size-md-cell-height'],
    '--forge-calendar-size-md-font-size': properties?.['size-md-font-size'],
    '--forge-calendar-size-md-padding': properties?.['size-md-padding'],
    '--forge-calendar-size-sm-cell-height': properties?.['size-sm-cell-height'],
    '--forge-calendar-size-sm-font-size': properties?.['size-sm-font-size'],
    '--forge-calendar-size-sm-padding': properties?.['size-sm-padding'],
    '--forge-calendar-size-xl-cell-height': properties?.['size-xl-cell-height'],
    '--forge-calendar-size-xl-font-size': properties?.['size-xl-font-size'],
    '--forge-calendar-size-xl-padding': properties?.['size-xl-padding'],
    '--forge-calendar-size-xs-cell-height': properties?.['size-xs-cell-height'],
    '--forge-calendar-size-xs-font-size': properties?.['size-xs-font-size'],
    '--forge-calendar-size-xs-padding': properties?.['size-xs-padding'],
    '--forge-calendar-surface-default': properties?.['surface-default'],
    '--forge-calendar-surface-hover': properties?.['surface-hover'],
    '--forge-calendar-surface-range': properties?.['surface-range'],
    '--forge-calendar-surface-selected': properties?.['surface-selected'],
    '--forge-calendar-text-default': properties?.['text-default'],
    '--forge-calendar-text-muted': properties?.['text-muted'],
    '--forge-calendar-text-range': properties?.['text-range'],
    '--forge-calendar-text-secondary': properties?.['text-secondary'],
    '--forge-calendar-text-selected': properties?.['text-selected'],
    '--forge-calendar-transition-duration': properties?.['transition-duration'],
    '--forge-calendar-transition-easing': properties?.['transition-easing'],
  }) as CalendarStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface CalendarProperties {
  /**
   * ISO date string (YYYY-MM-DD) — the selected date.
   * @model onUpdateModelValue
   */
  modelValue?: string;
  /** Earliest selectable ISO date (YYYY-MM-DD). */
  min?: string;
  /** Latest selectable ISO date (YYYY-MM-DD). */
  max?: string;
  /** ISO date strings (YYYY-MM-DD) that should be un-selectable. */
  disabledDates?: string[];
  /**
   * ISO date (YYYY-MM-DD) marking the **start** of a selected range. When set
   * (together with {@link CalendarProperties.rangeEnd}) the grid highlights the
   * whole range — start/end caps plus the days in between — instead of a single
   * selected day.
   */
  rangeStart?: string;
  /** ISO date (YYYY-MM-DD) marking the **end** of a selected range. */
  rangeEnd?: string;
  /**
   * ISO date (YYYY-MM-DD) acting as a **tentative** range end while the user is
   * still choosing it (typically the day under the cursor). When a
   * {@link CalendarProperties.rangeStart} is set but no
   * {@link CalendarProperties.rangeEnd} is yet, the grid previews the range from
   * the start to this date with a lighter highlight, so the range being picked
   * is visible before the second click.
   */
  previewEnd?: string;
  /**
   * Remove the calendar's own surface (border, shadow, background) so it sits
   * flush inside an already-bordered container such as a dropdown panel,
   * avoiding a doubled outline. Defaults to `false`.
   */
  flat?: boolean;
  /** Visual size of the calendar. Defaults to `'md'`. */
  size?: CalendarSize;
  /** IANA timezone string used for rendering (e.g. `"America/New_York"`). Defaults to the local timezone. */
  timezone?: string;
  /** Fired with the next selected ISO date (the controlled `v-model` update). */
  onUpdateModelValue?: (value: string) => void;
  /** Fired with the next selected ISO date whenever it changes. */
  onChange?: (value: string) => void;
  /**
   * Fired with the ISO date of the day under the cursor (and `undefined` when
   * the pointer leaves the grid). Lets a parent range picker feed the hovered
   * day back as {@link CalendarProperties.previewEnd} to preview the range.
   */
  onHoverDate?: (value: string | undefined) => void;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<CalendarStyleProperties>;
}

/** A single cell in the month grid. */
interface CalendarCell {
  day: number | undefined;
  iso: string | undefined;
  disabled: boolean;
}

const MONTHS = [
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
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/** The secondary picker shown in place of the day grid. */
type CalendarView = 'days' | 'months' | 'years';

/** Resolve the configured timezone, falling back to the local zone. */
function resolveZone(timezone: string | undefined): string {
  return timezone ?? 'local';
}

/** Parse an ISO date in the given zone, or `undefined` when invalid/empty. */
function parseISO(iso: string | undefined, timezone: string | undefined): DateTime | undefined {
  if (!iso) {
    return undefined;
  }
  const dateTime = DateTime.fromISO(iso, { zone: resolveZone(timezone) });
  return dateTime.isValid ? dateTime : undefined;
}

/** Today's ISO date in the configured zone. */
function todayISO(timezone: string | undefined): string {
  return DateTime.now().setZone(resolveZone(timezone)).toISODate() ?? '';
}

/** Build the Sunday-first month grid for the given year/month. */
function buildCells(
  viewYear: number,
  viewMonth: number,
  timezone: string | undefined,
  minDate: DateTime | undefined,
  maxDate: DateTime | undefined,
  disabledSet: Set<string>,
): CalendarCell[] {
  const firstOfMonth = DateTime.fromObject(
    { year: viewYear, month: viewMonth, day: 1 },
    { zone: resolveZone(timezone) },
  );
  // Sunday-first offset: JS getDay is 0(Sun)–6(Sat).
  const startOffset = firstOfMonth.toJSDate().getDay();
  const daysInMonth = firstOfMonth.daysInMonth ?? 30;

  const cells: CalendarCell[] = [];
  for (let index = 0; index < startOffset; index++) {
    cells.push({ day: undefined, iso: undefined, disabled: true });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateTime = firstOfMonth.set({ day });
    const iso = dateTime.toISODate() ?? '';
    let disabled = false;
    if (minDate && dateTime < minDate.startOf('day')) {
      disabled = true;
    }
    if (maxDate && dateTime > maxDate.startOf('day')) {
      disabled = true;
    }
    if (disabledSet.has(iso)) {
      disabled = true;
    }
    cells.push({ day, iso, disabled });
  }
  return cells;
}

/**
 * `ForgeCalendar` — a month-grid date picker authored once in the neutral JSX
 * dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * It renders a navigable month grid (Sunday-first) of selectable days, honouring
 * `min`/`max` bounds and an explicit `disabledDates` list, with IANA-timezone
 * aware rendering via `luxon`. Clicking the month label swaps the day grid for a
 * twelve-month grid, and clicking the year swaps it for a decade year grid that
 * pages in groups of ten (2026 → 2020–2029), so distant dates are a couple of
 * clicks away. It can also highlight a selected range (`rangeStart`/`rangeEnd`),
 * preview a tentative range from the start to the hovered day (`previewEnd`,
 * fed back via `onHoverDate`), and drop its own surface via `flat` when nested
 * inside an already-bordered container such as a dropdown panel. It composes the
 * migrated
 * {@link ForgeTypography} for the labels and owns its styling through the
 * co-located CSS Module `forge-calendar.module.scss`.
 *
 * Substitutions from the original Vue SFC: the `ref` view state becomes
 * {@link useState}; the `computed` grid becomes {@link useMemo}; the
 * external-sync `watch` becomes a {@link useEffect}; the
 * `@mission-platform/icons` chevrons become text glyphs; and the `v-model` +
 * `change` emits become the `onUpdateModelValue`/`onChange` callback props.
 */
export function ForgeCalendar(properties: Readonly<CalendarProperties>): MpElement {
  const style = createCalendarStyle(properties.properties);

  const {
    modelValue,
    min,
    max,
    disabledDates = [],
    rangeStart,
    rangeEnd,
    previewEnd,
    flat = false,
    size = 'md',
    timezone,
  } = properties;

  // Anchor the initially visible month on the selected value, then fall back to
  // a supplied range endpoint (so a range picker opens on the range's month),
  // and only then to today.
  const initialBase =
    parseISO(modelValue, timezone) ??
    parseISO(rangeStart, timezone) ??
    parseISO(rangeEnd, timezone) ??
    DateTime.now().setZone(resolveZone(timezone));
  const initialView = initialBase.startOf('month');

  const [viewYear, setViewYear] = useState<number>(initialView.year);
  const [viewMonth, setViewMonth] = useState<number>(initialView.month);
  const [view, setView] = useState<CalendarView>('days');

  // Sync the visible month when the selected value changes externally.
  useEffect(() => {
    const dateTime = parseISO(modelValue, timezone);
    if (dateTime) {
      setViewYear(dateTime.year);
      setViewMonth(dateTime.month);
    }
  }, [modelValue]);

  const minDate = useMemo(() => parseISO(min, timezone), [min, timezone]);
  const maxDate = useMemo(() => parseISO(max, timezone), [max, timezone]);
  const disabledSet = useMemo(() => new Set(disabledDates), [disabledDates]);

  const weeks = useMemo<CalendarCell[][]>(() => {
    const cells = buildCells(viewYear, viewMonth, timezone, minDate, maxDate, disabledSet);
    const grouped: CalendarCell[][] = [];
    for (let index = 0; index < cells.length; index += 7) {
      grouped.push(cells.slice(index, index + 7));
    }
    return grouped;
  }, [viewYear, viewMonth, timezone, minDate, maxDate, disabledSet]);

  const today = todayISO(timezone);

  const goToPreviousMonth = (): void => {
    const previous = DateTime.fromObject({ year: viewYear, month: viewMonth }, { zone: resolveZone(timezone) }).minus({
      months: 1,
    });
    setViewYear(previous.year);
    setViewMonth(previous.month);
  };

  const goToNextMonth = (): void => {
    const next = DateTime.fromObject({ year: viewYear, month: viewMonth }, { zone: resolveZone(timezone) }).plus({
      months: 1,
    });
    setViewYear(next.year);
    setViewMonth(next.month);
  };

  const selectDate = (iso: string | undefined, disabled: boolean): void => {
    if (!iso || disabled) {
      return;
    }
    properties.onUpdateModelValue?.(iso);
    properties.onChange?.(iso);
  };

  // Report the day under the cursor (or `undefined` on leave) so a parent range
  // picker can preview the tentative range; skipped for empty/disabled cells.
  const hoverDate = (iso: string | undefined, disabled: boolean): void => {
    if (disabled) {
      return;
    }
    properties.onHoverDate?.(iso);
  };

  const rangeActive = !!(rangeStart || rangeEnd);
  // Order the two ISO endpoints lexicographically (which is chronological for
  // `YYYY-MM-DD`); a single endpoint becomes the lone cap with no span.
  const [rangeLo, rangeHi] =
    rangeStart && rangeEnd
      ? rangeStart <= rangeEnd
        ? [rangeStart, rangeEnd]
        : [rangeEnd, rangeStart]
      : [rangeStart || rangeEnd || '', ''];

  const isSelected = (iso: string | undefined): boolean => !!iso && iso === modelValue;
  const isToday = (iso: string | undefined): boolean => !!iso && iso === today;
  const isRangeStart = (iso: string | undefined): boolean => rangeActive && !!iso && !!rangeLo && iso === rangeLo;
  const isRangeEnd = (iso: string | undefined): boolean => rangeActive && !!iso && !!rangeHi && iso === rangeHi;
  const isInRange = (iso: string | undefined): boolean =>
    rangeActive && !!iso && !!rangeLo && !!rangeHi && iso > rangeLo && iso < rangeHi;

  // While a start is chosen but no end yet, the hovered day previews the range:
  // order the start and the hovered day so the span renders either direction.
  const previewActive = !!(previewEnd && rangeStart && !rangeEnd);
  const [previewLo, previewHi] =
    previewActive && previewEnd
      ? rangeStart <= previewEnd
        ? [rangeStart, previewEnd]
        : [previewEnd, rangeStart]
      : ['', ''];

  const isPreviewEnd = (iso: string | undefined): boolean =>
    previewActive && !!iso && iso === previewEnd && iso !== rangeStart;
  const isInPreview = (iso: string | undefined): boolean =>
    previewActive && !!iso && !!previewLo && !!previewHi && iso > previewLo && iso < previewHi;

  const monthLabel = `${MONTHS[viewMonth - 1]} ${viewYear}`;

  // First year of the decade containing the view year (2026 → 2020); the grid
  // also shows the trailing year of the previous decade and the leading year of
  // the next, both rendered muted, so paging by ±10 stays oriented.
  const decadeStart = Math.floor(viewYear / 10) * 10;
  const decadeYears = Array.from({ length: 12 }, (_unused, index) => decadeStart - 1 + index);
  const decadeLabel = `${decadeStart} \u2013 ${decadeStart + 9}`;

  // The header's previous/next buttons page by month (day grid), year (month
  // grid) or decade (year grid) depending on the active secondary view.
  const goPrevious = (): void => {
    if (view === 'months') {
      setViewYear(viewYear - 1);
    } else if (view === 'years') {
      setViewYear(viewYear - 10);
    } else {
      goToPreviousMonth();
    }
  };

  const goNext = (): void => {
    if (view === 'months') {
      setViewYear(viewYear + 1);
    } else if (view === 'years') {
      setViewYear(viewYear + 10);
    } else {
      goToNextMonth();
    }
  };

  const selectMonth = (month: number): void => {
    setViewMonth(month);
    setView('days');
  };

  const selectYear = (year: number): void => {
    setViewYear(year);
    setView('days');
  };

  const weekdayHeader: MpChild = (
    <div
      className={styles['forge-calendar__row']}
      role="row"
    >
      {DAYS.map((day) => (
        <span
          key={day}
          aria-label={day}
          className={styles['forge-calendar__weekday']}
          role="columnheader"
        >
          {day}
        </span>
      ))}
    </div>
  );

  const weekRows: MpChild[] = weeks.map((week, weekIndex) => (
    <div
      key={weekIndex}
      className={styles['forge-calendar__row']}
      role="row"
    >
      {week.map((cell, cellIndex) => (
        <button
          key={cellIndex}
          aria-current={isToday(cell.iso) ? 'date' : undefined}
          aria-label={cell.iso ?? undefined}
          aria-selected={rangeActive ? isRangeStart(cell.iso) || isRangeEnd(cell.iso) : isSelected(cell.iso)}
          className={[
            styles['forge-calendar__day'],
            {
              [styles['forge-calendar__day--empty']]: !cell.day,
              [styles['forge-calendar__day--selected']]: !rangeActive && isSelected(cell.iso),
              [styles['forge-calendar__day--range-start']]: isRangeStart(cell.iso),
              [styles['forge-calendar__day--range-end']]: isRangeEnd(cell.iso),
              [styles['forge-calendar__day--in-range']]: isInRange(cell.iso),
              [styles['forge-calendar__day--preview-end']]: isPreviewEnd(cell.iso),
              [styles['forge-calendar__day--in-preview']]: isInPreview(cell.iso),
              [styles['forge-calendar__day--today']]:
                isToday(cell.iso) && !isSelected(cell.iso) && !isRangeStart(cell.iso) && !isRangeEnd(cell.iso),
              [styles['forge-calendar__day--disabled']]: cell.disabled && !!cell.day,
            },
          ]}
          disabled={!cell.day || cell.disabled}
          role="gridcell"
          type="button"
          onClick={() => selectDate(cell.iso, cell.disabled)}
          onMouseenter={() => hoverDate(cell.iso, cell.disabled)}
        >
          {cell.day ?? ''}
        </button>
      ))}
    </div>
  ));

  return (
    <div
      aria-label={`Calendar, ${monthLabel}`}
      className={[
        styles['forge-calendar'],
        styles[`forge-calendar--${size}`],
        {
          [styles['forge-calendar--flat']]: flat,
        },
      ]}
      role="application"
      style={style}
    >
      <div className={styles['forge-calendar__header']}>
        <button
          aria-label={view === 'days' ? 'Previous month' : view === 'months' ? 'Previous year' : 'Previous decade'}
          className={styles['forge-calendar__nav-btn']}
          type="button"
          onClick={goPrevious}
        >
          <ForgeIconChevron
            direction="left"
            size="sm"
          />
        </button>
        <span className={styles['forge-calendar__month-label']}>
          {view === 'years' ? (
            <ForgeTypography
              as="span"
              color="primary"
              variant="label"
            >
              {decadeLabel}
            </ForgeTypography>
          ) : view === 'months' ? (
            <button
              aria-label="Select year"
              className={styles['forge-calendar__label-btn']}
              type="button"
              onClick={() => setView('years')}
            >
              <ForgeTypography
                as="span"
                color="primary"
                variant="label"
              >
                {viewYear}
              </ForgeTypography>
            </button>
          ) : (
            <span className={styles['forge-calendar__label-group']}>
              <button
                aria-label="Select month"
                className={styles['forge-calendar__label-btn']}
                type="button"
                onClick={() => setView('months')}
              >
                <ForgeTypography
                  as="span"
                  color="primary"
                  variant="label"
                >
                  {MONTHS[viewMonth - 1]}
                </ForgeTypography>
              </button>
              <button
                aria-label="Select year"
                className={styles['forge-calendar__label-btn']}
                type="button"
                onClick={() => setView('years')}
              >
                <ForgeTypography
                  as="span"
                  color="primary"
                  variant="label"
                >
                  {viewYear}
                </ForgeTypography>
              </button>
            </span>
          )}
        </span>
        <button
          aria-label={view === 'days' ? 'Next month' : view === 'months' ? 'Next year' : 'Next decade'}
          className={styles['forge-calendar__nav-btn']}
          type="button"
          onClick={goNext}
        >
          <ForgeIconChevron
            direction="right"
            size="sm"
          />
        </button>
      </div>

      {view === 'days' ? (
        <div
          aria-label={monthLabel}
          className={styles['forge-calendar__grid']}
          role="grid"
          onMouseleave={() => hoverDate(undefined, false)}
        >
          {[weekdayHeader, ...weekRows]}
        </div>
      ) : view === 'months' ? (
        <div
          aria-label={`Select month, ${viewYear}`}
          className={styles['forge-calendar__months']}
          role="grid"
        >
          {MONTHS_SHORT.map((monthName, index) => (
            <button
              key={monthName}
              aria-label={MONTHS[index]}
              aria-selected={index + 1 === viewMonth}
              className={[
                styles['forge-calendar__cell'],
                {
                  [styles['forge-calendar__cell--current']]: index + 1 === viewMonth,
                },
              ]}
              type="button"
              onClick={() => selectMonth(index + 1)}
            >
              {monthName}
            </button>
          ))}
        </div>
      ) : (
        <div
          aria-label={`Select year, ${decadeLabel}`}
          className={styles['forge-calendar__years']}
          role="grid"
        >
          {decadeYears.map((year) => (
            <button
              key={year}
              aria-label={`${year}`}
              aria-selected={year === viewYear}
              className={[
                styles['forge-calendar__cell'],
                {
                  [styles['forge-calendar__cell--current']]: year === viewYear,
                  [styles['forge-calendar__cell--outside']]: year < decadeStart || year > decadeStart + 9,
                },
              ]}
              type="button"
              onClick={() => selectYear(year)}
            >
              {year}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
