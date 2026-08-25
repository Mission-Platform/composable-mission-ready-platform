import {
  classNames,
  hasSlot,
  Slot,
  useId,
  createForgeStyle,
  type MpChild,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge';

import { ForgeCard } from '../../molecules/forge-card';

import styles from './forge-data-card.module.scss';

/** Size token controlling the data card scale. */
export type DataCardSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
/** Colour tone of the card surface. */
export type DataCardVariant =
  'neutral' | 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'info' | 'error' | 'critical';
/** Direction of a metric's change. */
export type DataCardTrendDirection = 'up' | 'down' | 'neutral';

export interface VCardData {
  type: 'vcard';
  name?: string;
  firstName?: string;
  lastName?: string;
  organization?: string;
  title?: string;
  email?: string;
  phone?: string;
  address?: string;
  url?: string;
  [key: string]: unknown;
}

export interface ICalendarData {
  type: 'icalendar';
  title?: string;
  summary?: string;
  start?: string | Date;
  end?: string | Date;
  location?: string;
  description?: string;
  [key: string]: unknown;
}

/** Typed contact or calendar data displayed by `ForgeDataCard`. */
export type DataCardData = VCardData | ICalendarData;

/** @deprecated Data cards now use `VCardData` or `ICalendarData`. */
export interface DataCardTrend {
  direction: DataCardTrendDirection;
  value: string;
  label?: string;
}

interface LegacyMetricData {
  label?: string;
  value?: string | number;
  unit?: string;
  description?: string;
  trend?: DataCardTrend;
  status?: DataCardVariant;
  icon?: MpChild;
}

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface DataCardStyleProperties {
  readonly 'border-radius-md'?: string;
  readonly 'border-radius-sm'?: string;
  readonly 'color-action-primary'?: string;
  readonly 'color-border-default'?: string;
  readonly 'color-status-error'?: string;
  readonly 'color-status-success'?: string;
  readonly 'color-status-warning'?: string;
  readonly 'color-surface-primary'?: string;
  readonly 'color-surface-secondary'?: string;
  readonly 'color-text-primary'?: string;
  readonly 'color-text-secondary'?: string;
  readonly 'spacing-1'?: string;
  readonly 'spacing-2'?: string;
  readonly 'spacing-3'?: string;
  readonly 'spacing-4'?: string;
}

export type DataCardStyle = CSSStyleProperties & {
  readonly '--forge-data-card-border-radius-md'?: string | undefined;
  readonly '--forge-data-card-border-radius-sm'?: string | undefined;
  readonly '--forge-data-card-color-action-primary'?: string | undefined;
  readonly '--forge-data-card-color-border-default'?: string | undefined;
  readonly '--forge-data-card-color-status-error'?: string | undefined;
  readonly '--forge-data-card-color-status-success'?: string | undefined;
  readonly '--forge-data-card-color-status-warning'?: string | undefined;
  readonly '--forge-data-card-color-surface-primary'?: string | undefined;
  readonly '--forge-data-card-color-surface-secondary'?: string | undefined;
  readonly '--forge-data-card-color-text-primary'?: string | undefined;
  readonly '--forge-data-card-color-text-secondary'?: string | undefined;
  readonly '--forge-data-card-spacing-1'?: string | undefined;
  readonly '--forge-data-card-spacing-2'?: string | undefined;
  readonly '--forge-data-card-spacing-3'?: string | undefined;
  readonly '--forge-data-card-spacing-4'?: string | undefined;
};

function createDataCardStyle(properties: Readonly<DataCardStyleProperties> | undefined): DataCardStyle | undefined {
  return createForgeStyle({
    '--forge-data-card-border-radius-md': properties?.['border-radius-md'],
    '--forge-data-card-border-radius-sm': properties?.['border-radius-sm'],
    '--forge-data-card-color-action-primary': properties?.['color-action-primary'],
    '--forge-data-card-color-border-default': properties?.['color-border-default'],
    '--forge-data-card-color-status-error': properties?.['color-status-error'],
    '--forge-data-card-color-status-success': properties?.['color-status-success'],
    '--forge-data-card-color-status-warning': properties?.['color-status-warning'],
    '--forge-data-card-color-surface-primary': properties?.['color-surface-primary'],
    '--forge-data-card-color-surface-secondary': properties?.['color-surface-secondary'],
    '--forge-data-card-color-text-primary': properties?.['color-text-primary'],
    '--forge-data-card-color-text-secondary': properties?.['color-text-secondary'],
    '--forge-data-card-spacing-1': properties?.['spacing-1'],
    '--forge-data-card-spacing-2': properties?.['spacing-2'],
    '--forge-data-card-spacing-3': properties?.['spacing-3'],
    '--forge-data-card-spacing-4': properties?.['spacing-4'],
  }) as DataCardStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface DataCardProperties {
  /** Typed contact or calendar data. */
  data: DataCardData;
  /** Optional header/footer/default slot content. */
  children?: MpChild | readonly MpChild[];
  /** Header content, rendered above the metric. */
  header?: MpChild;
  /** Footer content, rendered below the metric. */
  footer?: MpChild;
  /** Size token. Defaults to `'md'`. */
  size?: DataCardSize;
  /** Colour tone. Defaults to the data status or `'neutral'`. */
  variant?: DataCardVariant;
  /** Render a loading skeleton instead of the data. */
  loading?: boolean;
  /** Render a compact ForgeCard surface. */
  compact?: boolean;
  /** Make the legacy metric fallback an anchor. */
  href?: string;
  /** Render a button that downloads the card data. */
  downloadable?: boolean;
  /** Download button label. */
  downloadLabel?: string;
  /** Download filename. Defaults to a valid `.vcf` or `.ics` extension. */
  downloadFilename?: string;
  /** Called before the browser download is initiated. */
  onDownload?: (data: DataCardData) => void;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<DataCardStyleProperties>;
}

function escapeRecord(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll(';', String.raw`\;`)
    .replaceAll(',', String.raw`\,`)
    .replaceAll(/\r?\n/g, String.raw`\n`);
}

function formatDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value)
      .replaceAll(/[-:]/g, '')
      .replaceAll(/\.\d{3}Z$/, 'Z');
  }
  return date
    .toISOString()
    .replaceAll(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

function isVCard(data: DataCardData): data is VCardData {
  return data.type === 'vcard';
}

function serializeData(data: DataCardData): { content: string; filename: string; mimeType: string } {
  if (isVCard(data)) {
    const name = data.name ?? ([data.firstName, data.lastName].filter(Boolean).join(' ') || 'Contact');
    const n = [data.lastName ?? '', data.firstName ?? ''].join(';');
    const lines = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${escapeRecord(name)}`, `N:${escapeRecord(n)}`];
    if (data.organization) lines.push(`ORG:${escapeRecord(data.organization)}`);
    if (data.title) lines.push(`TITLE:${escapeRecord(data.title)}`);
    if (data.email) lines.push(`EMAIL:${escapeRecord(data.email)}`);
    if (data.phone) lines.push(`TEL:${escapeRecord(data.phone)}`);
    if (data.address) lines.push(`ADR:${escapeRecord(data.address)}`);
    if (data.url) lines.push(`URL:${escapeRecord(data.url)}`);
    lines.push('END:VCARD');
    return { content: `${lines.join('\r\n')}\r\n`, filename: 'contact.vcf', mimeType: 'text/vcard;charset=utf-8' };
  }

  const uid = `forge-data-card-${escapeRecord(data.title ?? data.summary ?? 'event').replaceAll('\\', '-')}`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mission Platform//ForgeDataCard//EN',
    'BEGIN:VEVENT',
    `UID:${uid}@mission-platform`,
    `DTSTAMP:${formatDate(new Date())}`,
  ];
  if (data.title ?? data.summary) lines.push(`SUMMARY:${escapeRecord(data.title ?? data.summary ?? '')}`);
  if (data.start) lines.push(`DTSTART:${formatDate(data.start)}`);
  if (data.end) lines.push(`DTEND:${formatDate(data.end)}`);
  if (data.location) lines.push(`LOCATION:${escapeRecord(data.location)}`);
  if (data.description) lines.push(`DESCRIPTION:${escapeRecord(data.description)}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return { content: `${lines.join('\r\n')}\r\n`, filename: 'event.ics', mimeType: 'text/calendar;charset=utf-8' };
}

function downloadData(data: DataCardData, filename?: string): void {
  if (globalThis.document === undefined || typeof globalThis.URL?.createObjectURL !== 'function') {
    return;
  }
  const serialized = serializeData(data);
  const blob = new Blob([serialized.content], { type: serialized.mimeType });
  const url = globalThis.URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename ?? serialized.filename;
    anchor.click();
  } finally {
    if (typeof globalThis.URL.revokeObjectURL === 'function') {
      globalThis.URL.revokeObjectURL(url);
    }
  }
}

/** A semantic contact or calendar card with standards-compliant downloads. */
export function ForgeDataCard(properties: Readonly<DataCardProperties>): MpElement {
  const style = createDataCardStyle(properties.properties);

  const {
    data,
    header,
    footer,
    size = 'md',
    variant = 'neutral',
    loading = false,
    compact = false,
    href,
    downloadable = false,
    downloadLabel = 'Download data',
    downloadFilename,
  } = properties;
  const typedData = data as DataCardData;
  const legacyData = data as unknown as LegacyMetricData;
  const filename = downloadFilename ?? (isVCard(typedData) ? 'contact.vcf' : 'event.ics');
  const instanceId = useId().replaceAll(/[^a-zA-Z0-9_-]/g, '') || 'instance';
  const titleId = `forge-data-card-title-${instanceId}`;
  if (!isVCard(typedData) && typedData.type !== 'icalendar') {
    const metric = (
      <>
        {header !== undefined || hasSlot('header') ? (
          <header className={styles['forge-data-card__header']}>
            <Slot name="header">{header}</Slot>
          </header>
        ) : undefined}
        <div className={styles['forge-data-card__metric']}>
          <span
            className={styles['forge-data-card__label']}
            id={titleId}
          >
            {legacyData.label}
          </span>
          {loading ? (
            <div
              aria-label="Loading"
              className={styles['forge-data-card__skeleton']}
              role="status"
            />
          ) : (
            <span className={styles['forge-data-card__value']}>
              {legacyData.value}
              {legacyData.unit ? <small>{legacyData.unit}</small> : undefined}
            </span>
          )}
          {legacyData.description ? (
            <span className={styles['forge-data-card__description']}>{legacyData.description}</span>
          ) : undefined}
          {legacyData.trend && !loading ? (
            <span
              className={classNames(
                styles['forge-data-card__trend'],
                styles[`forge-data-card__trend--${legacyData.trend.direction}`],
              )}
            >
              {legacyData.trend.value}
            </span>
          ) : undefined}
        </div>
      </>
    );
    const legacyFooter = downloadable ? (
      <button
        aria-label={downloadLabel}
        onClick={() => properties.onDownload?.(typedData)}
        type="button"
      >
        {downloadLabel}
      </button>
    ) : undefined;
    const legacyWrapper = (
      <article
        aria-label={legacyData.label}
        aria-busy={loading ? 'true' : undefined}
        aria-labelledby={titleId}
        className={classNames(
          styles['forge-data-card'],
          styles[`forge-data-card--${size}`],
          styles[`forge-data-card--${legacyData.status ?? variant}`],
        )}
        style={style}
      >
        {href ? (
          <a
            className={styles['forge-data-card__link']}
            href={href}
          >
            {metric}
          </a>
        ) : (
          metric
        )}
        {legacyFooter}
      </article>
    );
    return legacyWrapper;
  }

  const label = isVCard(typedData)
    ? (typedData.name ?? ([typedData.firstName, typedData.lastName].filter(Boolean).join(' ') || 'Contact'))
    : (typedData.title ?? typedData.summary ?? 'Calendar event');
  const details = isVCard(typedData)
    ? [typedData.organization, typedData.title, typedData.email, typedData.phone].filter(Boolean)
    : [typedData.start, typedData.end, typedData.location, typedData.description].filter(Boolean).map(String);
  const content = (
    <div
      className={classNames(styles['forge-data-card__content'], {
        [styles['forge-data-card__content--compact']]: compact,
      })}
    >
      <strong>{label}</strong>
      {loading ? (
        <div
          aria-label="Loading"
          className={styles['forge-data-card__skeleton']}
          role="status"
        />
      ) : (
        details.map((detail) => <span key={detail}>{detail}</span>)
      )}
      {properties.children === undefined ? undefined : <Slot />}
    </div>
  );
  const footerContent =
    footer !== undefined || hasSlot('footer') || downloadable ? (
      <>
        {footer !== undefined || hasSlot('footer') ? <Slot name="footer">{footer}</Slot> : undefined}
        {downloadable ? (
          <button
            aria-label={downloadLabel}
            data-filename={filename}
            onClick={() => {
              properties.onDownload?.(typedData);
              downloadData(typedData, downloadFilename);
            }}
            type="button"
          >
            {downloadLabel}
          </button>
        ) : undefined}
      </>
    ) : undefined;
  return (
    <ForgeCard
      bordered
      footer={footerContent}
      header={header}
      padding={compact ? 'sm' : 'md'}
      size={size}
      variant={variant}
    >
      {content}
    </ForgeCard>
  );
}
