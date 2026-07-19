/**
 * Shared, framework-agnostic phone-number helpers for the write-once
 * `BasePhoneInput`, built on `@mission-platform/phone-number` — the platform's
 * own AssemblyScript/WebAssembly reimplementation of Google's libphonenumber.
 *
 * Like `theme-store.ts`, this module sits **inside** the
 * component folder but is a plain (non-component) helper: it imports no neutral
 * `@mission-platform/jsx` primitives and no JSX, so `@mission-platform/vite-plugin-jsx`
 * recognises it is not a sibling component and copies it **verbatim** into both
 * the React and the Vue generated trees (re-pointing the `./phone` import). The
 * `@mission-platform/phone-number` dependency therefore travels unchanged onto
 * both frameworks and is bundled by each framework's own Stage-2 build.
 *
 * The package exposes a **synchronous** `PhoneNumberUtil` instance (the inlined
 * wasm is compiled with the synchronous `WebAssembly` constructors), so these
 * pure functions can parse/format/validate during render without an async
 * boundary. They all swallow unparseable input so a partial / invalid number
 * never throws.
 */
import { PhoneNumberFormat, getPhoneNumberUtilSync, type PhoneNumberUtil } from '@mission-platform/phone-number';

/** The shared, memoised synchronous util instance. */
function util(): PhoneNumberUtil {
  return getPhoneNumberUtilSync();
}

/** Human-readable region names, when the runtime ships `Intl.DisplayNames`. */
const regionDisplayNames =
  typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function'
    ? new Intl.DisplayNames(['en'], { type: 'region' })
    : undefined;

/** A selectable country/region in the phone input's country picker. */
export interface PhoneCountry {
  /** The ISO 3166-1 alpha-2 region code, e.g. `US`. */
  region: string;
  /** The localised country name, e.g. `United States` (falls back to the region code). */
  name: string;
  /** The international calling code (no `+`), e.g. `1`. */
  dialCode: string;
  /** The flag emoji derived from the region code, e.g. 🇺🇸. */
  flag: string;
}

/** Derive the flag emoji for an ISO alpha-2 region code from its regional-indicator symbols. */
export function regionToFlag(region: string): string {
  const code = region.toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) {
    return '';
  }
  return String.fromCodePoint(...[...code].map((character) => 127_397 + character.codePointAt(0)!));
}

/** The localised country name for a region code (falls back to the code itself). */
export function regionName(region: string): string {
  return regionDisplayNames?.of(region.toUpperCase()) ?? region;
}

/** The international calling code (no `+`) for a region, or `''` when unknown. */
export function dialCode(region: string): string {
  const code = util().getCountryCodeForRegion(region);
  return code > 0 ? String(code) : '';
}

/**
 * Every region `@mission-platform/phone-number` supports, as a `PhoneCountry`
 * list sorted by localised name — the default option set for the country picker.
 */
export function listCountries(): PhoneCountry[] {
  return util()
    .getSupportedRegions()
    .map((region) => ({ region, name: regionName(region), dialCode: dialCode(region), flag: regionToFlag(region) }))
    .toSorted((a, b) => a.name.localeCompare(b.name));
}

/** Format a (possibly partial) input as the user types it for the given region. */
export function formatAsYouType(input: string, region: string): string {
  if (input.length === 0) {
    return '';
  }
  return util().formatAsYouType(input, region);
}

/** Format an input in the region's national format (falls back to the raw input). */
export function formatNational(input: string, region: string): string {
  if (input.trim().length === 0) {
    return '';
  }
  return util().format(input, region, PhoneNumberFormat.NATIONAL) ?? input;
}

/** Parse an input to its canonical E.164 form (`+…`), or `undefined` when unparseable. */
export function toE164(input: string, region: string): string | undefined {
  if (input.trim().length === 0) {
    return undefined;
  }
  return util().format(input, region, PhoneNumberFormat.E164);
}

/** Whether an input is a valid phone number for the given region. */
export function isValid(input: string, region: string): boolean {
  if (input.trim().length === 0) {
    return false;
  }
  return util().isValidNumberForRegion(input, region);
}

/** A national-format example number for the region (handy as a placeholder), or `''`. */
export function exampleNumber(region: string): string {
  const example = util().getExampleNumber(region);
  if (example === undefined) {
    return '';
  }
  return util().format(example, region, PhoneNumberFormat.NATIONAL) ?? '';
}
