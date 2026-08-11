export interface ICalendarParameter {
  name: string;
  value: string | string[];
}

export interface ICalendarProperty {
  name: string;
  parameters: ICalendarParameter[];
  value: string;
}

export interface ICalendarComponent {
  name: string;
  properties: ICalendarProperty[];
  components: ICalendarComponent[];
}

export interface ICalendar {
  components: ICalendarComponent[];
}

export interface ICalendarEvent {
  uid: string;
  summary: string;
  start: string;
  end?: string;
  description?: string;
  location?: string;
  status?: string;
  recurrenceRule?: string;
}

const TEXT_PROPERTIES = new Set([
  'CATEGORIES',
  'COMMENT',
  'CONTACT',
  'DESCRIPTION',
  'LOCATION',
  'RESOURCES',
  'SUMMARY',
  'TZID',
  'TZNAME',
]);
const BACKSLASH = String.fromCodePoint(92);

function decodeText(value: string): string {
  return value
    .replaceAll(`${BACKSLASH}n`, '\n')
    .replaceAll(`${BACKSLASH}N`, '\n')
    .replaceAll(`${BACKSLASH},`, ',')
    .replaceAll(`${BACKSLASH};`, ';')
    .replaceAll(`${BACKSLASH}${BACKSLASH}`, BACKSLASH);
}

function encodeText(value: string): string {
  return value
    .replaceAll(BACKSLASH, `${BACKSLASH}${BACKSLASH}`)
    .replaceAll('\n', `${BACKSLASH}n`)
    .replaceAll(';', `${BACKSLASH};`)
    .replaceAll(',', `${BACKSLASH},`);
}

function splitOutsideQuotes(value: string, separator: string): string[] {
  const result: string[] = [];
  let start = 0;
  let quoted = false;
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === '"') quoted = !quoted;
    else if (value[index] === separator && !quoted) {
      result.push(value.slice(start, index));
      start = index + 1;
    }
  }
  result.push(value.slice(start));
  return result;
}

function unfold(source: string): string[] {
  const lines = source.replaceAll('\r\n', '\n').replaceAll('\r', '\n').split('\n');
  const result: string[] = [];
  for (const line of lines) {
    if (/^[ \t]/.test(line) && result.length > 0) result[result.length - 1] += line.slice(1);
    else result.push(line);
  }
  return result;
}

function parseProperty(line: string): ICalendarProperty | undefined {
  const separator = line.indexOf(':');
  if (separator < 1) return undefined;
  const head = splitOutsideQuotes(line.slice(0, separator), ';');
  const name = head.shift()?.toUpperCase();
  if (!name) return undefined;
  const parameters = head.flatMap((part) => {
    const equals = part.indexOf('=');
    if (equals < 1) return [];
    const parameterValue = part.slice(equals + 1);
    const value =
      parameterValue.startsWith('"') && parameterValue.endsWith('"') ? parameterValue.slice(1, -1) : parameterValue;
    return [{ name: part.slice(0, equals).toUpperCase(), value: value.includes(',') ? value.split(',') : value }];
  });
  const rawValue = line.slice(separator + 1);
  return { name, parameters, value: TEXT_PROPERTIES.has(name) ? decodeText(rawValue) : rawValue };
}

/** Parse an RFC 5545 iCalendar stream, preserving every component and property. */
export function readICalendar(source: string): ICalendar {
  const root: ICalendarComponent = { name: 'ROOT', properties: [], components: [] };
  const stack: ICalendarComponent[] = [root];
  for (const line of unfold(source)) {
    if (line.length === 0) continue;
    const begin = /^BEGIN:(.+)$/i.exec(line);
    if (begin) {
      const component: ICalendarComponent = { name: begin[1].toUpperCase(), properties: [], components: [] };
      stack.at(-1)?.components.push(component);
      stack.push(component);
      continue;
    }
    const end = /^END:(.+)$/i.exec(line);
    if (end) {
      if (stack.length > 1 && stack.at(-1)?.name === end[1].toUpperCase()) stack.pop();
      continue;
    }
    const property = parseProperty(line);
    if (property) stack.at(-1)?.properties.push(property);
  }
  return { components: root.components };
}

export const parseICalendar = readICalendar;

function writeProperty(property: ICalendarProperty): string {
  const parameters = property.parameters
    .map((parameter) => {
      const value = Array.isArray(parameter.value) ? parameter.value.join(',') : parameter.value;
      return `;${parameter.name.toUpperCase()}=${value}`;
    })
    .join('');
  const value = TEXT_PROPERTIES.has(property.name.toUpperCase()) ? encodeText(property.value) : property.value;
  return `${property.name.toUpperCase()}${parameters}:${value}`;
}

function writeComponent(component: ICalendarComponent): string[] {
  return [
    `BEGIN:${component.name.toUpperCase()}`,
    ...component.properties.map((property) => writeProperty(property)),
    ...component.components.flatMap((child) => writeComponent(child)),
    `END:${component.name.toUpperCase()}`,
  ];
}

/** Serialize an RFC 5545 calendar with CRLF line endings and 75-octet-safe folding. */
export function writeICalendar(calendar: ICalendar): string {
  const lines = calendar.components.flatMap((component) => writeComponent(component));
  const folded = lines.flatMap((line) => {
    const parts: string[] = [];
    let remaining = line;
    while (remaining.length > 75) {
      parts.push(remaining.slice(0, 75));
      remaining = ` ${remaining.slice(75)}`;
    }
    parts.push(remaining);
    return parts;
  });
  return folded.join('\r\n');
}

export const serializeICalendar = writeICalendar;

function propertyValue(component: ICalendarComponent, name: string): string | undefined {
  return component.properties.find((property) => property.name === name)?.value;
}

/** Build a typed VEVENT component suitable for insertion into an iCalendar. */
export function createICalendarEvent(event: ICalendarEvent): ICalendarComponent {
  return {
    name: 'VEVENT',
    properties: [
      { name: 'UID', parameters: [], value: event.uid },
      { name: 'DTSTART', parameters: [], value: event.start },
      ...(event.end ? [{ name: 'DTEND', parameters: [], value: event.end }] : []),
      { name: 'SUMMARY', parameters: [], value: event.summary },
      ...(event.description ? [{ name: 'DESCRIPTION', parameters: [], value: event.description }] : []),
      ...(event.location ? [{ name: 'LOCATION', parameters: [], value: event.location }] : []),
      ...(event.status ? [{ name: 'STATUS', parameters: [], value: event.status }] : []),
      ...(event.recurrenceRule ? [{ name: 'RRULE', parameters: [], value: event.recurrenceRule }] : []),
    ],
    components: [],
  };
}

/** Convert VEVENT components into the typed event view used by Forge renderers. */
export function calendarEvents(calendar: ICalendar): ICalendarEvent[] {
  const events: ICalendarEvent[] = [];
  const visit = (component: ICalendarComponent): void => {
    if (component.name === 'VEVENT') {
      const uid = propertyValue(component, 'UID');
      const summary = propertyValue(component, 'SUMMARY');
      const start = propertyValue(component, 'DTSTART');
      if (uid && summary && start)
        events.push({
          uid,
          summary,
          start,
          end: propertyValue(component, 'DTEND'),
          description: propertyValue(component, 'DESCRIPTION'),
          location: propertyValue(component, 'LOCATION'),
          status: propertyValue(component, 'STATUS'),
          recurrenceRule: propertyValue(component, 'RRULE'),
        });
    }
    for (const child of component.components) visit(child);
  };
  for (const component of calendar.components) visit(component);
  return events;
}
