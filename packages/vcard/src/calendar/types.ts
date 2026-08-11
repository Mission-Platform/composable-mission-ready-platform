/** A half-open date range `[start, end)`. */
export interface DateRange {
  start: Date;
  end: Date;
}

/** The first day a week-based view starts on (0 = Sunday … 6 = Saturday). */
export type WeekStart = 0 | 1 | 2 | 3 | 4 | 5 | 6;
