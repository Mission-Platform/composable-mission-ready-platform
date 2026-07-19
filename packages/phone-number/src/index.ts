// Public, typed wrapper around the AssemblyScript/WebAssembly phone-number core.
//
// This is a focused reimplementation of the core operations of Google's
// libphonenumber (https://github.com/google/libphonenumber): parsing,
// possibility/validity checks, number-type classification and formatting.
//
// The heavy lifting runs in WebAssembly (compiled from `assembly/`); this
// module provides an ergonomic, fully typed façade with a lazily-instantiated
// singleton so consumers never touch the raw wasm exports.

import { loadModule, loadModuleSync, type RawPhoneNumberExports } from './generated/phone-number.js';

/** Line type of a phone number, mirroring libphonenumber's `PhoneNumberType`. */
export const PhoneNumberType = {
  FIXED_LINE: 0,
  MOBILE: 1,
  FIXED_LINE_OR_MOBILE: 2,
  UNKNOWN: -1,
} as const;
export type PhoneNumberType = (typeof PhoneNumberType)[keyof typeof PhoneNumberType];

/** Output format, mirroring libphonenumber's `PhoneNumberFormat`. */
export const PhoneNumberFormat = {
  /** `+14155552671` */
  E164: 0,
  /** `+1 415 555 2671` */
  INTERNATIONAL: 1,
  /** `(415) 555-2671` */
  NATIONAL: 2,
  /** `tel:+14155552671` */
  RFC3966: 3,
} as const;
export type PhoneNumberFormat = (typeof PhoneNumberFormat)[keyof typeof PhoneNumberFormat];

/** A two-letter ISO 3166-1 region code, e.g. `"US"`, `"GB"`. */
export type RegionCode = string;

/**
 * Typed façade over the WebAssembly phone-number core. Obtain an instance with
 * {@link PhoneNumberUtil.getInstance} (or the convenience {@link getPhoneNumberUtil}).
 */
export class PhoneNumberUtil {
  private static instance: Promise<PhoneNumberUtil> | null = null;
  private static syncInstance: PhoneNumberUtil | null = null;

  private readonly wasm: RawPhoneNumberExports;

  private constructor(wasm: RawPhoneNumberExports) {
    this.wasm = wasm;
  }

  /** Resolve the shared, memoised instance, instantiating wasm on first use. */
  static getInstance(): Promise<PhoneNumberUtil> {
    if (PhoneNumberUtil.instance === null) {
      PhoneNumberUtil.instance = loadModule().then((wasm) => new PhoneNumberUtil(wasm));
    }
    return PhoneNumberUtil.instance;
  }

  /**
   * Resolve the shared, memoised instance **synchronously**, instantiating wasm
   * on first use. Handy where an async boundary is impractical (e.g. rendering);
   * the inlined wasm is compiled with the synchronous `WebAssembly` constructors.
   */
  static getInstanceSync(): PhoneNumberUtil {
    if (PhoneNumberUtil.syncInstance === null) {
      PhoneNumberUtil.syncInstance = new PhoneNumberUtil(loadModuleSync());
    }
    return PhoneNumberUtil.syncInstance;
  }

  /** ITU country calling code for a region, or `0` when the region is unknown. */
  getCountryCodeForRegion(region: RegionCode): number {
    return this.wasm.getCountryCodeForRegion(region);
  }

  /** Primary region for a calling code, or `undefined` when unknown. */
  getRegionCodeForCountryCode(code: number): RegionCode | undefined {
    const region = this.wasm.getRegionCodeForCountryCode(code);
    return region.length > 0 ? region : undefined;
  }

  /** Region the number belongs to, or `undefined` when it cannot be resolved. */
  getRegionCodeForNumber(input: string, defaultRegion: RegionCode): RegionCode | undefined {
    const region = this.wasm.getRegionCodeForNumber(input, defaultRegion);
    return region.length > 0 ? region : undefined;
  }

  /** National significant number (country code and trunk prefix removed). */
  getNationalSignificantNumber(input: string, defaultRegion: RegionCode): string {
    return this.wasm.getNationalSignificantNumber(input, defaultRegion);
  }

  /** Whether the number has a plausible length for its region. */
  isPossibleNumber(input: string, defaultRegion: RegionCode): boolean {
    return this.wasm.isPossibleNumber(input, defaultRegion);
  }

  /** Whether the number is a valid, dialable number for its region. */
  isValidNumber(input: string, defaultRegion: RegionCode): boolean {
    return this.wasm.isValidNumber(input, defaultRegion);
  }

  /** Whether the number is valid **and** actually belongs to `region`. */
  isValidNumberForRegion(input: string, region: RegionCode): boolean {
    return this.wasm.isValidNumberForRegion(input, region);
  }

  /** Classify the number as fixed line, mobile, both or unknown. */
  getNumberType(input: string, defaultRegion: RegionCode): PhoneNumberType {
    return this.wasm.getNumberType(input, defaultRegion) as PhoneNumberType;
  }

  /** The ISO 3166-1 alpha-2 region codes supported by the metadata. */
  getSupportedRegions(): RegionCode[] {
    const joined = this.wasm.getSupportedRegions();
    return joined.length > 0 ? joined.split(',') : [];
  }

  /** A representative example number (E.164 form) for a region, or `undefined`. */
  getExampleNumber(region: RegionCode): string | undefined {
    const example = this.wasm.getExampleNumber(region);
    return example.length > 0 ? example : undefined;
  }

  /** Render the number in the requested format, or `undefined` when unparsable. */
  format(input: string, defaultRegion: RegionCode, format: PhoneNumberFormat): string | undefined {
    const formatted = this.wasm.format(input, defaultRegion, format);
    return formatted.length > 0 ? formatted : undefined;
  }

  /** Format a (possibly partial) input as the user types it for `region`. */
  formatAsYouType(input: string, region: RegionCode): string {
    return this.wasm.formatAsYouType(input, region);
  }
}

/** Convenience accessor for the shared {@link PhoneNumberUtil} instance. */
export function getPhoneNumberUtil(): Promise<PhoneNumberUtil> {
  return PhoneNumberUtil.getInstance();
}

/** Convenience accessor for the shared, synchronous {@link PhoneNumberUtil} instance. */
export function getPhoneNumberUtilSync(): PhoneNumberUtil {
  return PhoneNumberUtil.getInstanceSync();
}
