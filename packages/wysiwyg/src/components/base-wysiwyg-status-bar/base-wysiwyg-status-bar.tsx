import { h, type MpElement, type MpProperties } from '@mission-platform/forge';

import { resolveLabels, type WysiwygLabels } from '../../utils/labels';
import { EMPTY_EDITOR_STATS, type EditorStats } from '../../utils/text-stats';

import styles from './base-wysiwyg-status-bar.module.scss';

/** How the status items are distributed across the bar. */
export type WysiwygStatusBarAlign = 'start' | 'center' | 'end' | 'between';

/**
 * A single, user-configurable status-bar entry.
 *
 * Each item renders as one segment of the bar: a numeric/string `value`
 * followed by its `label` (e.g. `12 words`), or just the `label` when no value
 * is supplied. Passing an array of these to {@link WysiwygStatusBarProperties.items}
 * fully replaces the built-in word/character segments with a custom set.
 */
export interface WysiwygStatusItem {
  /** Stable identity for the segment (used as the render key). */
  id: string;
  /** The text shown for the segment (e.g. `words`, or a standalone message). */
  label: string;
  /** An optional leading value rendered before the label (e.g. `12`). */
  value?: string | number;
}

export interface WysiwygStatusBarProperties extends MpProperties {
  /** The live editor statistics the default segments are derived from. */
  stats?: EditorStats;
  /**
   * A user-configurable list of status segments. When provided, it fully
   * replaces the built-in word/character segments; any `children` are still
   * appended after the items.
   */
  items?: WysiwygStatusItem[];
  /** How the segments are distributed across the bar. Defaults to `'start'`. */
  align?: WysiwygStatusBarAlign;
  /** Overridable labels (English defaults). */
  labels?: Partial<WysiwygLabels>;
}

/**
 * Build the built-in word/character segments from the editor statistics.
 */
function buildDefaultStatusItems(stats: EditorStats, labels: WysiwygLabels): WysiwygStatusItem[] {
  return [
    { id: 'words', label: labels.words, value: stats.words },
    { id: 'characters', label: labels.characters, value: stats.characters },
  ];
}

/**
 * `BaseWysiwygStatusBar` — the editor's status bar, extracted into its own
 * framework-agnostic, fully customisable component authored once in the neutral
 * JSX dialect and compiled to both Vue 3 and React by
 * `@mission-platform/vite-plugin-forge`.
 *
 * By default it shows the live word and character counts derived from the
 * supplied {@link EditorStats}. Callers can completely replace those segments by
 * passing their own {@link WysiwygStatusItem} array through `items` (e.g. to add
 * a "reading time" or "cursor position" segment), tune the layout with `align`,
 * and append arbitrary trailing content through `children`. It owns its styling
 * through the co-located CSS Module `base-wysiwyg-status-bar.module.scss`.
 */
export function BaseWysiwygStatusBar(properties: Readonly<WysiwygStatusBarProperties>): MpElement {
  const labels = resolveLabels(properties.labels);
  const stats = properties.stats ?? EMPTY_EDITOR_STATS;
  const align = properties.align ?? 'start';
  const items = properties.items ?? buildDefaultStatusItems(stats, labels);

  return (
    <div
      className={[styles['wysiwyg-status-bar'], styles[`wysiwyg-status-bar--${align}`]]}
      role="status"
      aria-live="polite"
      aria-label={labels.statusBar}
    >
      {items.map((item) => (
        <span
          key={item.id}
          className={styles['wysiwyg-status-bar__item']}
        >
          {item.value === undefined ? item.label : `${item.value} ${item.label}`}
        </span>
      ))}
      {properties.children}
    </div>
  );
}
