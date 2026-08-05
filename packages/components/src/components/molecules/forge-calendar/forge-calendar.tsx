import {
  h,
  type MpChild,
  type MpElement,
  type MpProperties,
  useEffect,
  useMemo,
  useState,
} from '@mission-platform/forge';
import { ForgeIconChevron } from '@mission-platform/icons';
import { DateTime } from 'luxon';

import { ForgeTypography } from '../../atoms/forge-typography';

import styles from './forge-calendar.module.scss';

/** Visual size of the calendar, matching the shared size scale. */
export type CalendarSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface CalendarProperties extends MpProperties {
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
