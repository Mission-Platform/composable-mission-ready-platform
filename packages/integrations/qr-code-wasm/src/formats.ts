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

export { vCard, type VCardOptions } from '@mission-platform/vcard';

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

/** Normalise a `string | readonly string[]` into an array, dropping empty entries. */
function toList(value: string | readonly string[] | undefined): string[] {
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

/** Resolves the Wi-Fi authentication tag. */
function wifiAuthType(encryption?: string): string {
  if (encryption === 'nopass') return 'nopass';
  return encryption ?? 'WPA';
}

/** Builds password and visibility parameters for Wi-Fi config. */
function wifiSecurityParts(auth: string, options: WifiOptions): string[] {
  const parts: string[] = [];
  if (auth !== 'nopass' && options.password) {
    parts.push(`P:${escapeSpecial(options.password)}`);
  }
  if (options.hidden) {
    parts.push('H:true');
  }
  return parts;
}

/**
 * A `WIFI:` payload that lets a scanner join a wireless network.
 *
 * @example
 * wifi({ ssid: 'Cafe', password: 'latte123', encryption: 'WPA' })
 * // => 'WIFI:T:WPA;S:Cafe;P:latte123;;'
 */
export function wifi(options: WifiOptions): string {
  const auth = wifiAuthType(options.encryption);
  const parts = [`T:${auth}`, `S:${escapeSpecial(options.ssid)}`, ...wifiSecurityParts(auth, options)];
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

/** Formats name field for MeCard. */
function meCardName(first?: string, last?: string): string | undefined {
  if (!first && !last) return undefined;
  return `N:${escapeSpecial(last ?? '')},${escapeSpecial(first ?? '')}`;
}

/** Formats repetitive multi-value contact fields. */
function meCardContactFields(phones?: string | readonly string[], emails?: string | readonly string[]): string[] {
  const parts: string[] = [];
  for (const number of toList(phones)) parts.push(`TEL:${escapeSpecial(number)}`);
  for (const address of toList(emails)) parts.push(`EMAIL:${escapeSpecial(address)}`);
  return parts;
}

/** Formats optional metadata fields for MeCard. */
function meCardMetaFields(options: Pick<MeCardOptions, 'url' | 'address' | 'birthday' | 'note'>): string[] {
  const parts: string[] = [];
  if (options.url) parts.push(`URL:${escapeSpecial(options.url)}`);
  if (options.address) parts.push(`ADR:${escapeSpecial(options.address)}`);
  if (options.birthday) parts.push(`BDAY:${escapeSpecial(options.birthday)}`);
  if (options.note) parts.push(`NOTE:${escapeSpecial(options.note)}`);
  return parts;
}

/**
 * A `MECARD:` payload — the compact contact format understood by most cameras.
 * Multiple phone numbers / emails are emitted as repeated `TEL:` / `EMAIL:`
 * fields.
 */
export function meCard(options: MeCardOptions): string {
  const name = meCardName(options.firstName, options.lastName);
  const parts: string[] = [
    ...(name === undefined ? [] : [name]),
    ...meCardContactFields(options.phone, options.email),
    ...meCardMetaFields(options),
  ];

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

/** Formats iCalendar event start and end timestamp lines. */
function formatICalDates(start: Date, end?: Date, allDay?: boolean): string[] {
  if (allDay) {
    const lines = [`DTSTART;VALUE=DATE:${formatICalDate(start)}`];
    if (end) lines.push(`DTEND;VALUE=DATE:${formatICalDate(end)}`);
    return lines;
  }
  const lines = [`DTSTART:${formatICalUtc(start)}`];
  if (end) lines.push(`DTEND:${formatICalUtc(end)}`);
  return lines;
}

/** Formats optional location and description lines. */
function formatICalMeta(location?: string, description?: string): string[] {
  const lines: string[] = [];
  if (location) lines.push(`LOCATION:${escapeICal(location)}`);
  if (description) lines.push(`DESCRIPTION:${escapeICal(description)}`);
  return lines;
}

/**
 * A minimal iCalendar (`VCALENDAR` → `VEVENT`) payload for a single event that
 * scanners offer to add to the calendar.
 *
 * Timed events use UTC `DTSTART` / `DTEND`; all-day events use `VALUE=DATE`
 * date-only stamps.
 */
export function iCalEvent(options: ICalEventOptions): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `SUMMARY:${escapeICal(options.title)}`,
    ...formatICalDates(options.start, options.end, options.allDay),
    ...formatICalMeta(options.location, options.description),
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.join('\n');
}
