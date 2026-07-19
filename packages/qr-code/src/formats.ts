// Ready-made payload builders for the most common QR Code "actions".
//
// A QR Code is just an opaque string as far as the encoder is concerned — the
// *meaning* comes from well-known text conventions that scanning apps
// recognise (a `WIFI:` block joins a network, a `BEGIN:VCARD` block adds a
// contact, and so on). These builders assemble those strings from typed inputs,
// handling the fiddly escaping and field-ordering rules so callers can feed the
// result straight into {@link encodeQr}.
//
// Every builder returns a plain `string`; nothing here touches the WebAssembly
// encoder, so the helpers are cheap, synchronous, and safe to use anywhere.

/** Wi-Fi authentication type understood by the `WIFI:` payload scheme. */
export type WifiEncryption = 'WPA' | 'WEP' | 'nopass';

/** Options for {@link wifi}. */
export interface WifiOptions {
  /** The network name (SSID). */
  ssid: string;
  /** The pre-shared key. Omit (or leave empty) for an open network. */
  password?: string;
  /**
   * Authentication type. Defaults to `'WPA'` (covers WPA/WPA2/WPA3); use
   * `'nopass'` for an open network. When `'nopass'`, any `password` is ignored.
   */
  encryption?: WifiEncryption;
  /** Whether the SSID is hidden (not broadcast). Defaults to `false`. */
  hidden?: boolean;
}

/** Options for {@link email}. */
export interface EmailOptions {
  /** Recipient address. */
  to: string;
  /** Optional subject line. */
  subject?: string;
  /** Optional message body. */
  body?: string;
}

/** Options for {@link sms}. */
export interface SmsOptions {
  /** Destination phone number, ideally in E.164 form (e.g. `+14155550123`). */
  number: string;
  /** Optional pre-filled message text. */
  message?: string;
}

/** Options for {@link geo}. */
export interface GeoOptions {
  /** Latitude in decimal degrees. */
  latitude: number;
  /** Longitude in decimal degrees. */
  longitude: number;
  /** Optional altitude in metres. */
  altitude?: number;
}

/** Options for {@link vCard} — a subset of the vCard 3.0 field set. */
export interface VCardOptions {
  /** First / given name. */
  firstName?: string;
  /** Last / family name. */
  lastName?: string;
  /** Full formatted name. Derived from first/last names when omitted. */
  formattedName?: string;
  /** Organisation / company. */
  organization?: string;
  /** Job title. */
  title?: string;
  /** One or more phone numbers. */
  phone?: string | string[];
  /** One or more email addresses. */
  email?: string | string[];
  /** Website URL. */
  url?: string;
  /** Free-form postal address (single line). */
  address?: string;
  /** Free-form note. */
  note?: string;
}

/** Options for {@link meCard} — the compact contact format used by many phones. */
export interface MeCardOptions {
  /** First / given name. */
  firstName?: string;
  /** Last / family name. */
  lastName?: string;
  /** One or more phone numbers. */
  phone?: string | string[];
  /** One or more email addresses. */
  email?: string | string[];
  /** Website URL. */
  url?: string;
  /** Free-form postal address. */
  address?: string;
  /** Birthday in `YYYYMMDD` form. */
  birthday?: string;
  /** Free-form note / memo. */
  note?: string;
}

/** Options for {@link iCalEvent} — a single `VEVENT` calendar entry. */
export interface ICalEventOptions {
  /** Event title (`SUMMARY`). */
  title: string;
  /** Start of the event. */
  start: Date;
  /** End of the event. Ignored for all-day events without an explicit end. */
  end?: Date;
  /** When `true`, emit a date-only, all-day event. Defaults to `false`. */
  allDay?: boolean;
  /** Location. */
  location?: string;
  /** Longer description. */
  description?: string;
}

/**
 * Escape the characters that are structural in the `WIFI:` / `MECARD:` grammars
 * (`\`, `;`, `,`, `:`, `"`) by prefixing each with a backslash.
 */
function escapeSpecial(value: string): string {
  return value.replace(/([\\;,:"])/g, '\\$1');
}

/**
 * Escape a value for iCalendar text fields per RFC 5545: backslash, newline,
 * comma, and semicolon are the reserved characters.
 */
function escapeICal(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

/** Normalise a `string | string[]` into an array, dropping empty entries. */
function toList(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return (Array.isArray(value) ? value : [value]).filter((entry) => entry.length > 0);
}

/**
 * The payload for a URL / plain text code. URLs are returned verbatim; this
 * builder exists mostly for symmetry and intent at the call site.
 */
export function url(value: string): string {
  return value;
}

/**
 * A `WIFI:` payload that lets a scanner join a wireless network.
 *
 * @example
 * wifi({ ssid: 'Cafe', password: 'latte123', encryption: 'WPA' })
 * // => 'WIFI:T:WPA;S:Cafe;P:latte123;;'
 */
export function wifi(options: WifiOptions): string {
  const encryption = options.encryption ?? 'WPA';
  const isOpen = encryption === 'nopass';
  const parts = [`T:${isOpen ? 'nopass' : encryption}`, `S:${escapeSpecial(options.ssid)}`];
  if (!isOpen && options.password) {
    parts.push(`P:${escapeSpecial(options.password)}`);
  }
  if (options.hidden) {
    parts.push('H:true');
  }
  return `WIFI:${parts.join(';')};;`;
}

/**
 * A `mailto:` payload that opens a pre-composed email. Subject and body are
 * percent-encoded as query parameters.
 */
export function email(options: EmailOptions): string {
  const query: string[] = [];
  if (options.subject) query.push(`subject=${encodeURIComponent(options.subject)}`);
  if (options.body) query.push(`body=${encodeURIComponent(options.body)}`);
  const suffix = query.length > 0 ? `?${query.join('&')}` : '';
  return `mailto:${options.to}${suffix}`;
}

/**
 * An `SMSTO:` payload that opens a pre-composed text message. This scheme is
 * the most widely recognised across scanner apps.
 */
export function sms(options: SmsOptions): string {
  return options.message ? `SMSTO:${options.number}:${options.message}` : `SMSTO:${options.number}`;
}

/** A `tel:` payload that dials a phone number. */
export function phone(number: string): string {
  return `tel:${number}`;
}

/**
 * A `geo:` payload (RFC 5870) that opens a set of map coordinates, optionally
 * including altitude.
 */
export function geo(options: GeoOptions): string {
  const base = `geo:${options.latitude},${options.longitude}`;
  return options.altitude === undefined ? base : `${base},${options.altitude}`;
}

/**
 * A vCard 3.0 payload describing a contact. Multiple phone numbers / emails are
 * emitted as repeated `TEL` / `EMAIL` lines.
 */
export function vCard(options: VCardOptions): string {
  const first = options.firstName ?? '';
  const last = options.lastName ?? '';
  const formatted = options.formattedName ?? [first, last].filter(Boolean).join(' ');

  const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
  lines.push(`N:${last};${first};;;`);
  if (formatted) lines.push(`FN:${formatted}`);
  if (options.organization) lines.push(`ORG:${options.organization}`);
  if (options.title) lines.push(`TITLE:${options.title}`);
  for (const number of toList(options.phone)) lines.push(`TEL:${number}`);
  for (const address of toList(options.email)) lines.push(`EMAIL:${address}`);
  if (options.url) lines.push(`URL:${options.url}`);
  if (options.address) lines.push(`ADR:;;${options.address};;;;`);
  if (options.note) lines.push(`NOTE:${options.note}`);
  lines.push('END:VCARD');

  return lines.join('\n');
}

/**
 * A `MECARD:` payload — the compact contact format understood by most cameras.
 * Multiple phone numbers / emails are emitted as repeated `TEL:` / `EMAIL:`
 * fields.
 */
export function meCard(options: MeCardOptions): string {
  const first = options.firstName ?? '';
  const last = options.lastName ?? '';

  const parts: string[] = [];
  if (first || last) parts.push(`N:${escapeSpecial(last)},${escapeSpecial(first)}`);
  for (const number of toList(options.phone)) parts.push(`TEL:${escapeSpecial(number)}`);
  for (const address of toList(options.email)) parts.push(`EMAIL:${escapeSpecial(address)}`);
  if (options.url) parts.push(`URL:${escapeSpecial(options.url)}`);
  if (options.address) parts.push(`ADR:${escapeSpecial(options.address)}`);
  if (options.birthday) parts.push(`BDAY:${escapeSpecial(options.birthday)}`);
  if (options.note) parts.push(`NOTE:${escapeSpecial(options.note)}`);

  return `MECARD:${parts.map((part) => `${part};`).join('')};`;
}

/** Format a `Date` as an iCalendar UTC timestamp: `YYYYMMDDTHHMMSSZ`. */
function formatICalUtc(date: Date): string {
  return `${date.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
}

/** Format a `Date` as an iCalendar date value: `YYYYMMDD` (UTC). */
function formatICalDate(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

/**
 * A minimal iCalendar (`VCALENDAR` → `VEVENT`) payload for a single event that
 * scanners offer to add to the calendar.
 *
 * Timed events use UTC `DTSTART` / `DTEND`; all-day events use `VALUE=DATE`
 * date-only stamps.
 */
export function iCalEvent(options: ICalEventOptions): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT'];
  lines.push(`SUMMARY:${escapeICal(options.title)}`);

  if (options.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${formatICalDate(options.start)}`);
    if (options.end) lines.push(`DTEND;VALUE=DATE:${formatICalDate(options.end)}`);
  } else {
    lines.push(`DTSTART:${formatICalUtc(options.start)}`);
    if (options.end) lines.push(`DTEND:${formatICalUtc(options.end)}`);
  }

  if (options.location) lines.push(`LOCATION:${escapeICal(options.location)}`);
  if (options.description) lines.push(`DESCRIPTION:${escapeICal(options.description)}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');

  return lines.join('\n');
}
