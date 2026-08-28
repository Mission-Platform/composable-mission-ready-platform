/** A property in a parsed vCard, including parameters and its decoded value. */
export interface VCardProperty {
  name: string;
  parameters: Record<string, string | string[]>;
  value: string;
}

/** A complete vCard document. Unknown properties are retained for round-tripping. */
export interface VCard {
  version: string;
  properties: VCardProperty[];
}

/** Options for {@link vCard} — a convenient subset of the vCard 3.0 field set. */
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

function escapeValue(value: string): string {
  const backslash = String.fromCodePoint(92);
  return value
    .replaceAll(backslash, `${backslash}${backslash}`)
    .replaceAll('\n', `${backslash}n`)
    .replaceAll(';', `${backslash};`)
    .replaceAll(',', `${backslash},`);
}

function unescapeValue(value: string): string {
  const backslash = String.fromCodePoint(92);
  return value
    .replaceAll(`${backslash}n`, '\n')
    .replaceAll(`${backslash}N`, '\n')
    .replaceAll(`${backslash},`, ',')
    .replaceAll(`${backslash};`, ';')
    .replaceAll(`${backslash}${backslash}`, backslash);
}

/** Normalise a `string | string[]` into an array, dropping empty entries. */
function toList(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return (Array.isArray(value) ? value : [value]).filter((entry) => entry.length > 0);
}

function property(name: string, value: string, parameters: Record<string, string | string[]> = {}): VCardProperty {
  return { name: name.toUpperCase(), parameters, value };
}

/** Convert convenience options into a complete, writable vCard document. */
export function createVCard(options: VCardOptions): VCard {
  const first = options.firstName ?? '';
  const last = options.lastName ?? '';
  const formatted = options.formattedName ?? [first, last].filter(Boolean).join(' ');
  const properties: VCardProperty[] = [property('N', `${last};${first};;;`)];
  if (formatted) properties.push(property('FN', formatted));
  if (options.organization) properties.push(property('ORG', options.organization));
  if (options.title) properties.push(property('TITLE', options.title));
  for (const number of toList(options.phone)) properties.push(property('TEL', number));
  for (const address of toList(options.email)) properties.push(property('EMAIL', address));
  if (options.url) properties.push(property('URL', options.url));
  if (options.address) properties.push(property('ADR', `;;${options.address};;;;`));
  if (options.note) properties.push(property('NOTE', options.note));
  return { version: '3.0', properties };
}

function serializeParameter(value: string | string[]): string {
  return Array.isArray(value) ? value.join(',') : value;
}

function serializePropertyValue(name: string, value: string): string {
  if (name === 'N' || name === 'ADR')
    return value
      .split(';')
      .map((part) => escapeValue(part))
      .join(';');
  return escapeValue(value);
}

/** Serialize one complete vCard, using LF line endings for QR and text payloads. */
export function writeVCard(card: VCard): string {
  const lines = ['BEGIN:VCARD', `VERSION:${escapeValue(card.version || '3.0')}`];
  for (const item of card.properties) {
    const name = item.name.toUpperCase();
    if (name === 'BEGIN' || name === 'END' || name === 'VERSION') continue;
    const parameters = Object.entries(item.parameters)
      .map(([key, value]) => `;${key.toUpperCase()}=${serializeParameter(value)}`)
      .join('');
    lines.push(`${name}${parameters}:${serializePropertyValue(name, item.value)}`);
  }
  lines.push('END:VCARD');
  return lines.join('\n');
}

function splitProperty(line: string): VCardProperty | undefined {
  const separator = line.indexOf(':');
  if (separator < 1) return undefined;
  const head = line.slice(0, separator);
  const value = unescapeValue(line.slice(separator + 1));
  const parts = head.split(';');
  const name = parts.shift()?.toUpperCase();
  if (!name) return undefined;
  const parameters: Record<string, string | string[]> = {};
  for (const parameter of parts) {
    const equals = parameter.indexOf('=');
    if (equals < 1) continue;
    const key = parameter.slice(0, equals).toUpperCase();
    const parameterValue = parameter.slice(equals + 1);
    parameters[key] = parameterValue.includes(',') ? parameterValue.split(',') : parameterValue;
  }
  return { name, parameters, value };
}

function unfold(source: string): string[] {
  const lines = source.replaceAll('\r\n', '\n').replaceAll('\r', '\n').split('\n');
  const unfolded: string[] = [];
  for (const line of lines) {
    if (/^[ \t]/.test(line) && unfolded.length > 0) unfolded[unfolded.length - 1] += line.slice(1);
    else unfolded.push(line);
  }
  return unfolded;
}

/** Parse one or more vCard blocks while retaining unknown properties. */
export function readVCard(source: string): VCard[] {
  const cards: VCard[] = [];
  let current: VCard | undefined;
  for (const line of unfold(source)) {
    if (line.toUpperCase() === 'BEGIN:VCARD') {
      current = { version: '3.0', properties: [] };
      continue;
    }
    if (line.toUpperCase() === 'END:VCARD') {
      if (current) cards.push(current);
      current = undefined;
      continue;
    }
    if (!current) continue;
    const parsed = splitProperty(line);
    if (!parsed) continue;
    if (parsed.name === 'VERSION') current.version = parsed.value;
    else current.properties.push(parsed);
  }
  return cards;
}

/** Alias for callers that prefer the parser terminology. */
export const parseVCard: typeof readVCard = readVCard;

/** Serialize one or more parsed cards. */
export function writeVCards(cards: readonly VCard[]): string {
  return cards.map((card) => writeVCard(card)).join('\n');
}

/** Map a parsed card back to the convenience options used by the QR builder. */
export function toVCardOptions(card: VCard): VCardOptions {
  const find = (name: string): string[] =>
    card.properties.filter((item) => item.name === name).map((item) => item.value);
  const n = find('N')[0]?.split(';') ?? [];
  const phone = find('TEL');
  const email = find('EMAIL');
  const address = find('ADR')[0]?.split(';')[2];
  return {
    lastName: n[0],
    firstName: n[1],
    formattedName: find('FN')[0],
    organization: find('ORG')[0],
    title: find('TITLE')[0],
    phone: phone.length === 1 ? phone[0] : phone,
    email: email.length === 1 ? email[0] : email,
    url: find('URL')[0],
    address,
    note: find('NOTE')[0],
  };
}

/**
 * A vCard 3.0 payload describing a contact. Multiple phone numbers / emails are
 * emitted as repeated `TEL` / `EMAIL` lines.
 */
export function vCard(options: VCardOptions): string {
  return writeVCard(createVCard(options));
}
