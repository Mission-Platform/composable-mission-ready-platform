// AssemblyScript reimplementation of Google libphonenumber's core operations:
// parsing, possibility/validity checks, number-type classification and
// formatting. Compiled to WebAssembly and consumed through the typed wrapper
// in `src/`.
//
// String arguments/returns cross the wasm boundary via AssemblyScript's ESM
// bindings, so the exported surface uses plain `string`, `bool` and `i32`.

import { REGION_METADATA, CODE_TO_REGION, REGION_LIST, PhoneMetadata } from './metadata';

// Re-export the regex bytecode VM test entry points so the wasm module exposes
// them for diff-testing against the TypeScript reference implementation.
export { reTest, reCaptures } from './regex';

// Number types, mirroring libphonenumber's PhoneNumberType ordinals we support.
export const enum NumberType {
  FIXED_LINE = 0,
  MOBILE = 1,
  FIXED_LINE_OR_MOBILE = 2,
  UNKNOWN = -1,
}

// Output formats, mirroring libphonenumber's PhoneNumberFormat.
export const enum PhoneNumberFormat {
  E164 = 0,
  INTERNATIONAL = 1,
  NATIONAL = 2,
  RFC3966 = 3,
}

/** Outcome of parsing a raw input into its structured components. */
class ParseResult {
  ok: bool;
  countryCode: i32;
  regionCode: string;
  nationalNumber: string;

  constructor(ok: bool, countryCode: i32, regionCode: string, nationalNumber: string) {
    this.ok = ok;
    this.countryCode = countryCode;
    this.regionCode = regionCode;
    this.nationalNumber = nationalNumber;
  }

  static fail(): ParseResult {
    return new ParseResult(false, 0, '', '');
  }
}

function isDigit(code: i32): bool {
  return code >= 0x30 && code <= 0x39;
}

/** Keep only ASCII digits from `input`. */
function digitsOnly(input: string): string {
  let out = '';
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    if (isDigit(code)) {
      out += input.charAt(i);
    }
  }
  return out;
}

/** True when `input` (after trimming leading spaces) begins with '+'. */
function hasPlusPrefix(input: string): bool {
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    if (code == 0x2b) return true; // '+'
    if (isDigit(code)) return false;
    // skip other separators (spaces, parens, dashes, dots)
  }
  return false;
}

/**
 * Match the longest known country calling code (1..3 digits) that prefixes
 * `digits`. Returns the calling code, or 0 when none matches.
 */
function extractCountryCode(digits: string): i32 {
  for (let len = 3; len >= 1; len--) {
    if (digits.length <= len) continue;
    const candidate = I32.parseInt(digits.substring(0, len));
    if (CODE_TO_REGION.has(candidate)) {
      return candidate;
    }
  }
  return 0;
}

/** Strip a region's trunk prefix from `nsn` when doing so yields a valid length. */
function stripNationalPrefix(nsn: string, meta: PhoneMetadata): string {
  const prefix = meta.nationalPrefix;
  if (prefix.length == 0) return nsn;
  if (!nsn.startsWith(prefix)) return nsn;
  const stripped = nsn.substring(prefix.length);
  if (isPossibleLength(stripped.length, meta)) {
    return stripped;
  }
  return nsn;
}

function isPossibleLength(length: i32, meta: PhoneMetadata): bool {
  const lengths = meta.possibleLengths;
  for (let i = 0; i < lengths.length; i++) {
    if (lengths[i] == length) return true;
  }
  return false;
}

function matchesAnyPrefix(nsn: string, prefixes: string[]): bool {
  for (let i = 0; i < prefixes.length; i++) {
    if (nsn.startsWith(prefixes[i])) return true;
  }
  return false;
}

/**
 * Parse `input`, using `defaultRegion` only when the input is not in
 * international (`+` / `00`) form.
 */
function parse(input: string, defaultRegion: string): ParseResult {
  if (input.length == 0) return ParseResult.fail();

  const digits = digitsOnly(input);
  if (digits.length == 0) return ParseResult.fail();

  // International form: leading '+', or a "00" / "011" IDD prefix.
  let international = hasPlusPrefix(input);
  let rest = digits;
  if (!international) {
    if (digits.startsWith('011')) {
      international = true;
      rest = digits.substring(3);
    } else if (digits.startsWith('00')) {
      international = true;
      rest = digits.substring(2);
    }
  }

  if (international) {
    const code = extractCountryCode(rest);
    if (code == 0) return ParseResult.fail();
    const region = CODE_TO_REGION.get(code);
    const codeLen = code.toString().length;
    const nsn = rest.substring(codeLen);
    return new ParseResult(true, code, region, nsn);
  }

  // National form: interpret using the default region's metadata.
  if (!REGION_METADATA.has(defaultRegion)) return ParseResult.fail();
  const meta = REGION_METADATA.get(defaultRegion);
  const nsn = stripNationalPrefix(digits, meta);
  return new ParseResult(true, meta.countryCode, meta.regionCode, nsn);
}

// ---------------------------------------------------------------------------
// Exported API.
// ---------------------------------------------------------------------------

/** ITU country calling code for a region, or 0 when the region is unknown. */
export function getCountryCodeForRegion(region: string): i32 {
  if (!REGION_METADATA.has(region)) return 0;
  return REGION_METADATA.get(region).countryCode;
}

/** Primary region for a calling code, or "" when the code is unknown. */
export function getRegionCodeForCountryCode(code: i32): string {
  if (!CODE_TO_REGION.has(code)) return '';
  return CODE_TO_REGION.get(code);
}

/** Region a parsed number belongs to, or "" when it cannot be resolved. */
export function getRegionCodeForNumber(input: string, defaultRegion: string): string {
  const parsed = parse(input, defaultRegion);
  if (!parsed.ok) return '';
  return parsed.regionCode;
}

/** The national significant number (no country code / trunk prefix). */
export function getNationalSignificantNumber(input: string, defaultRegion: string): string {
  const parsed = parse(input, defaultRegion);
  if (!parsed.ok) return '';
  return parsed.nationalNumber;
}

/** True when the number's length is plausible for its region. */
export function isPossibleNumber(input: string, defaultRegion: string): bool {
  const parsed = parse(input, defaultRegion);
  if (!parsed.ok) return false;
  const meta = REGION_METADATA.get(parsed.regionCode);
  return isPossibleLength(parsed.nationalNumber.length, meta);
}

/** True when the number is a valid, dialable number for its region. */
export function isValidNumber(input: string, defaultRegion: string): bool {
  return getNumberType(input, defaultRegion) != NumberType.UNKNOWN;
}

/**
 * True when the number is valid **and** actually belongs to `region` (mirrors
 * libphonenumber's `isValidNumberForRegion`).
 */
export function isValidNumberForRegion(input: string, region: string): bool {
  const parsed = parse(input, region);
  if (!parsed.ok) return false;
  if (parsed.regionCode != region) return false;
  return isValidNumber(input, region);
}

/** The supported region codes, comma-separated (e.g. "US,CA,GB"). */
export function getSupportedRegions(): string {
  let out = '';
  for (let i = 0; i < REGION_LIST.length; i++) {
    if (out.length > 0) out += ',';
    out += REGION_LIST[i];
  }
  return out;
}

/**
 * A representative example number for `region` in E.164 form, or "" when the
 * region is unknown (mirrors libphonenumber's `getExampleNumber`).
 */
export function getExampleNumber(region: string): string {
  if (!REGION_METADATA.has(region)) return '';
  const meta = REGION_METADATA.get(region);
  if (meta.exampleNsn.length == 0) return '';
  return '+' + meta.countryCode.toString() + meta.exampleNsn;
}

/** Classify a parsed number as fixed line, mobile, both or unknown. */
export function getNumberType(input: string, defaultRegion: string): i32 {
  const parsed = parse(input, defaultRegion);
  if (!parsed.ok) return NumberType.UNKNOWN;

  const meta = REGION_METADATA.get(parsed.regionCode);
  const nsn = parsed.nationalNumber;
  if (!isPossibleLength(nsn.length, meta)) return NumberType.UNKNOWN;

  const hasMobile = meta.mobileLeading.length > 0;
  const hasFixed = meta.fixedLeading.length > 0;

  if (!hasMobile && !hasFixed) {
    // No dedicated ranges (e.g. North America): could be either.
    return NumberType.FIXED_LINE_OR_MOBILE;
  }
  if (hasMobile && matchesAnyPrefix(nsn, meta.mobileLeading)) {
    return NumberType.MOBILE;
  }
  if (matchesAnyPrefix(nsn, meta.fixedLeading)) {
    return NumberType.FIXED_LINE;
  }
  if (!hasFixed) {
    // Only mobile ranges are enumerated; anything else is a fixed line.
    return NumberType.FIXED_LINE;
  }
  return NumberType.UNKNOWN;
}

/** Split `digits` into space-separated groups of the given sizes. */
function groupDigits(digits: string, groups: i32[]): string {
  let out = '';
  let index = 0;
  for (let g = 0; g < groups.length && index < digits.length; g++) {
    const size = groups[g];
    const end = index + size <= digits.length ? index + size : digits.length;
    if (out.length > 0) out += ' ';
    out += digits.substring(index, end);
    index = end;
  }
  if (index < digits.length) {
    if (out.length > 0) out += ' ';
    out += digits.substring(index);
  }
  return out;
}

/** Render a number in the requested format, or "" when parsing fails. */
export function format(input: string, defaultRegion: string, fmt: i32): string {
  const parsed = parse(input, defaultRegion);
  if (!parsed.ok) return '';

  const meta = REGION_METADATA.get(parsed.regionCode);
  const nsn = parsed.nationalNumber;
  const code = parsed.countryCode.toString();
  const e164 = '+' + code + nsn;

  if (fmt == PhoneNumberFormat.E164) {
    return e164;
  }
  if (fmt == PhoneNumberFormat.RFC3966) {
    return 'tel:' + e164;
  }
  if (fmt == PhoneNumberFormat.INTERNATIONAL) {
    return '+' + code + ' ' + groupDigits(nsn, meta.internationalGroups);
  }

  // NATIONAL.
  if (parsed.countryCode == 1) {
    // North American Numbering Plan: "(NPA) NXX-XXXX".
    if (nsn.length == 10) {
      return '(' + nsn.substring(0, 3) + ') ' + nsn.substring(3, 6) + '-' + nsn.substring(6, 10);
    }
    return nsn;
  }
  return meta.nationalPrefix + groupDigits(nsn, meta.nationalFormatGroups);
}

/** Progressive NANP national formatting for a (possibly partial) NSN. */
function formatNanpPartial(nsn: string): string {
  const n = nsn.length;
  if (n <= 3) return nsn;
  if (n <= 6) return '(' + nsn.substring(0, 3) + ') ' + nsn.substring(3);
  if (n <= 10) return '(' + nsn.substring(0, 3) + ') ' + nsn.substring(3, 6) + '-' + nsn.substring(6);
  // Overflowing the plan: keep the formatted 10 digits, append the rest raw.
  return '(' + nsn.substring(0, 3) + ') ' + nsn.substring(3, 6) + '-' + nsn.substring(6, 10) + nsn.substring(10);
}

/**
 * Format a (possibly partial) national input as the user types it, mirroring
 * the incremental output of libphonenumber's `AsYouTypeFormatter`. Non-digits
 * are ignored; an international ('+' / IDD) input is passed through digits-only
 * with a leading '+'.
 */
export function formatAsYouType(input: string, region: string): string {
  const digits = digitsOnly(input);
  if (digits.length == 0) return '';

  // International input: we don't attempt national grouping — surface the
  // dialled digits behind a '+'.
  if (hasPlusPrefix(input)) {
    return '+' + digits;
  }

  if (!REGION_METADATA.has(region)) return digits;
  const meta = REGION_METADATA.get(region);

  if (meta.countryCode == 1) {
    let nsn = digits;
    // Drop a leading trunk '1' once past the 10-digit plan length.
    if (nsn.length > 10 && nsn.startsWith('1')) nsn = nsn.substring(1);
    return formatNanpPartial(nsn);
  }

  // Generic regions: strip the trunk prefix, group the remainder, re-add it.
  let rest = digits;
  let prefix = '';
  if (meta.nationalPrefix.length > 0 && rest.startsWith(meta.nationalPrefix)) {
    prefix = meta.nationalPrefix;
    rest = rest.substring(meta.nationalPrefix.length);
  }
  if (rest.length == 0) return prefix;
  const grouped = groupDigits(rest, meta.nationalFormatGroups);
  return prefix + grouped;
}
