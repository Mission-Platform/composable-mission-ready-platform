const RESULT_HEADER_LENGTH = 12;
const MAX_RESULT_WIRE_LENGTH = 1_048_576;

export interface ParsedResultEnvelope {
  readonly formatId: number;
  readonly decoded: boolean;
  readonly numBits: number;
  readonly payload: string;
}

/**
 * Checks whether the character at the specified index is an ASCII decimal digit.
 */
function isAsciiDigit(value: string, index: number): boolean {
  const code = value.charCodeAt(index);
  return code >= 48 && code <= 57;
}

/**
 * Validates that all characters in a substring range are ASCII decimal digits.
 */
function isAllAsciiDigits(value: string, start: number, end: number): boolean {
  for (let index = start; index < end; index += 1) {
    if (!isAsciiDigit(value, index)) return false;
  }
  return true;
}

/**
 * Parses an ASCII decimal slice into a safe integer, or null if invalid.
 */
function parseDecimalField(value: string, start: number, end: number): number | null {
  if (start < 0 || end > value.length || start >= end) return null;
  if (!isAllAsciiDigits(value, start, end)) return null;
  const parsed = Number.parseInt(value.slice(start, end), 10);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

/**
 * Validates the prefix format of a versioned result header.
 */
function isValidVersionHeader(encoded: string): boolean {
  if (encoded.length < RESULT_HEADER_LENGTH) return false;
  return encoded[0] === 'R' && (encoded[1] === '0' || encoded[1] === '1');
}

/**
 * Validates format ID and bit count limits for versioned envelopes.
 */
function isValidFormatAndBits(formatId: number | null, numBits: number | null): boolean {
  if (formatId === null || formatId > 15) return false;
  if (numBits === null || numBits > MAX_RESULT_WIRE_LENGTH * 8) return false;
  return true;
}

/**
 * Validates constraints on undecoded result envelopes.
 */
function isValidUndecodedState(status: string, length: number, numBits: number): boolean {
  if (status !== '0') return true;
  return length === RESULT_HEADER_LENGTH && numBits === 0;
}

/**
 * Parses versioned scanner result envelopes ('R0' or 'R1' prefix).
 */
function parseVersionedEnvelope(encoded: string): ParsedResultEnvelope | null {
  if (!isValidVersionHeader(encoded)) return null;

  const formatId = parseDecimalField(encoded, 2, 4);
  const numBits = parseDecimalField(encoded, 4, RESULT_HEADER_LENGTH);
  if (!isValidFormatAndBits(formatId, numBits)) return null;
  if (!isValidUndecodedState(encoded[1], encoded.length, numBits as number)) return null;

  return {
    formatId: formatId as number,
    decoded: encoded[1] === '1',
    numBits: numBits as number,
    payload: encoded.slice(RESULT_HEADER_LENGTH),
  };
}

/**
 * Checks if the string prefix matches a legacy format tag ('L' or 'D').
 */
function isLegacyTag(char: string): boolean {
  return char === 'L' || char === 'D';
}

/**
 * Parses legacy unversioned envelope strings ('L' or 'D' prefix).
 */
function parseLegacyEnvelope(encoded: string): ParsedResultEnvelope | null {
  if (encoded.length < 3 || !isLegacyTag(encoded[0])) return null;
  const formatId = parseDecimalField(encoded, 1, 3);
  if (formatId === null || formatId > 15) return null;
  return {
    formatId,
    decoded: encoded[0] === 'D',
    numBits: 0,
    payload: encoded.slice(3),
  };
}

/**
 * Parse the bounded scanner result wire format without reading untrusted
 * offsets or accepting malformed fixed-width fields. `R0`/`R1` is the current
 * versioned header; `L`/`D` remains readable for artifacts produced before
 * the header was introduced.
 */
export function parseResultEnvelope(encoded: string): ParsedResultEnvelope | null {
  if (encoded.length === 0 || encoded.length > MAX_RESULT_WIRE_LENGTH) return null;
  return encoded[0] === 'R' ? parseVersionedEnvelope(encoded) : parseLegacyEnvelope(encoded);
}

export const resultEnvelopeLimits = Object.freeze({
  headerLength: RESULT_HEADER_LENGTH,
  maxLength: MAX_RESULT_WIRE_LENGTH,
});
