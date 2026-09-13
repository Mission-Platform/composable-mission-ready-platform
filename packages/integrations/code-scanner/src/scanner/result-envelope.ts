const RESULT_HEADER_LENGTH = 12;
const MAX_RESULT_WIRE_LENGTH = 1_048_576;

export interface ParsedResultEnvelope {
  readonly formatId: number;
  readonly decoded: boolean;
  readonly numBits: number;
  readonly payload: string;
}

function isAsciiDigit(value: string, index: number): boolean {
  const code = value.charCodeAt(index);
  return code >= 48 && code <= 57;
}

function parseDecimalField(value: string, start: number, end: number): number | null {
  if (start < 0 || end > value.length || start >= end) return null;
  for (let index = start; index < end; index += 1) {
    if (!isAsciiDigit(value, index)) return null;
  }
  const parsed = Number.parseInt(value.slice(start, end), 10);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function parseVersionedEnvelope(encoded: string): ParsedResultEnvelope | null {
  if (encoded.length < RESULT_HEADER_LENGTH || encoded[0] !== 'R') return null;
  if (encoded[1] !== '0' && encoded[1] !== '1') return null;

  const formatId = parseDecimalField(encoded, 2, 4);
  const numBits = parseDecimalField(encoded, 4, RESULT_HEADER_LENGTH);
  if (formatId === null || formatId > 15 || numBits === null || numBits > MAX_RESULT_WIRE_LENGTH * 8) return null;
  if (encoded[1] === '0' && (encoded.length !== RESULT_HEADER_LENGTH || numBits !== 0)) return null;

  return {
    formatId,
    decoded: encoded[1] === '1',
    numBits,
    payload: encoded.slice(RESULT_HEADER_LENGTH),
  };
}

function parseLegacyEnvelope(encoded: string): ParsedResultEnvelope | null {
  if (encoded.length < 3 || (encoded[0] !== 'L' && encoded[0] !== 'D')) return null;
  const formatId = parseDecimalField(encoded, 1, 3);
  if (formatId === null || formatId > 15) return null;
  const payload = encoded.slice(3);
  return {
    formatId,
    decoded: encoded[0] === 'D',
    numBits: 0,
    payload,
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
