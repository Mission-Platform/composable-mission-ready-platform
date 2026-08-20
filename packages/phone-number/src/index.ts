// Public, typed wrapper around the Forge Web Script/WebAssembly phone-number core.
//
// This is a focused reimplementation of the core operations of Google's
// libphonenumber (https://github.com/google/libphonenumber): parsing,
// possibility/validity checks, number-type classification and formatting.
//
// The heavy lifting runs in WebAssembly (compiled from `phone-number.fws`); this
// module provides an ergonomic, fully typed façade with a lazily-instantiated
// singleton so consumers never touch the raw wasm exports.

import type { ForgePhoneNumberExports, ForgeString } from './phone-number.fws';
import { load, loadSync } from './phone-number.fws';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8', { fatal: true });

function withInputStrings<T>(
  wasmExports: ForgePhoneNumberExports,
  values: readonly string[],
  callback: (...references: ForgeString[]) => T,
): T {
  const allocations = values.map((value) => {
    const bytes = textEncoder.encode(value);
    const pointer = wasmExports.fws_alloc(bytes.byteLength);
    new Uint8Array(wasmExports.memory.buffer).set(bytes, pointer);
    return { pointer, length: bytes.byteLength } as const;
  });

  try {
    return callback(...allocations.map(({ pointer, length }) => [pointer, length] as ForgeString));
  } finally {
    for (const { pointer, length } of allocations) wasmExports.fws_dealloc(pointer, length);
  }
}

function readString(wasmExports: ForgePhoneNumberExports, value: ForgeString): string {
  const [pointer, length] = value;
  return textDecoder.decode(new Uint8Array(wasmExports.memory.buffer, pointer, length));
}

function invokeString(
  wasmExports: ForgePhoneNumberExports,
  values: readonly string[],
  callback: (...references: ForgeString[]) => ForgeString,
): string {
  return withInputStrings(wasmExports, values, (...references) => readString(wasmExports, callback(...references)));
}

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

  private readonly wasm: ForgePhoneNumberExports;

  private constructor(wasm: ForgePhoneNumberExports) {
    this.wasm = wasm;
  }

  /** Resolve the shared, memoised instance, instantiating wasm on first use. */
  static getInstance(): Promise<PhoneNumberUtil> {
    if (PhoneNumberUtil.instance === null) {
      PhoneNumberUtil.instance = load().then((wasm) => new PhoneNumberUtil(wasm));
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
      PhoneNumberUtil.syncInstance = new PhoneNumberUtil(loadSync());
    }
    return PhoneNumberUtil.syncInstance;
  }

  /** ITU country calling code for a region, or `0` when the region is unknown. */
  getCountryCodeForRegion(region: RegionCode): number {
    return withInputStrings(this.wasm, [region], (regionReference) =>
      this.wasm.getCountryCodeForRegion(...regionReference),
    );
  }

  /** Primary region for a calling code, or `undefined` when unknown. */
  getRegionCodeForCountryCode(code: number): RegionCode | undefined {
    const region = readString(this.wasm, this.wasm.getRegionCodeForCountryCode(code));
    return region.length > 0 ? region : undefined;
  }

  /** Region the number belongs to, or `undefined` when it cannot be resolved. */
  getRegionCodeForNumber(input: string, defaultRegion: RegionCode): RegionCode | undefined {
    const region = invokeString(this.wasm, [input, defaultRegion], (inputReference, regionReference) =>
      this.wasm.getRegionCodeForNumber(...inputReference, ...regionReference),
    );
    return region.length > 0 ? region : undefined;
  }

  /** National significant number (country code and trunk prefix removed). */
  getNationalSignificantNumber(input: string, defaultRegion: RegionCode): string {
    return invokeString(this.wasm, [input, defaultRegion], (inputReference, regionReference) =>
      this.wasm.getNationalSignificantNumber(...inputReference, ...regionReference),
    );
  }

  /** Whether the number has a plausible length for its region. */
  isPossibleNumber(input: string, defaultRegion: RegionCode): boolean {
    return Boolean(
      withInputStrings(this.wasm, [input, defaultRegion], (inputReference, regionReference) =>
        this.wasm.isPossibleNumber(...inputReference, ...regionReference),
      ),
    );
  }

  /** Whether the number is a valid, dialable number for its region. */
  isValidNumber(input: string, defaultRegion: RegionCode): boolean {
    return Boolean(
      withInputStrings(this.wasm, [input, defaultRegion], (inputReference, regionReference) =>
        this.wasm.isValidNumber(...inputReference, ...regionReference),
      ),
    );
  }

  /** Whether the number is valid **and** actually belongs to `region`. */
  isValidNumberForRegion(input: string, region: RegionCode): boolean {
    return Boolean(
      withInputStrings(this.wasm, [input, region], (inputReference, regionReference) =>
        this.wasm.isValidNumberForRegion(...inputReference, ...regionReference),
      ),
    );
  }

  /** Classify the number as fixed line, mobile, both or unknown. */
  getNumberType(input: string, defaultRegion: RegionCode): PhoneNumberType {
    return withInputStrings(
      this.wasm,
      [input, defaultRegion],
      (inputReference, regionReference) =>
        this.wasm.getNumberType(...inputReference, ...regionReference) as PhoneNumberType,
    );
  }

  /** The ISO 3166-1 alpha-2 region codes supported by the metadata. */
  getSupportedRegions(): RegionCode[] {
    const joined = readString(this.wasm, this.wasm.getSupportedRegions());
    return joined.length > 0 ? joined.split(',') : [];
  }

  /** A representative example number (E.164 form) for a region, or `undefined`. */
  getExampleNumber(region: RegionCode): string | undefined {
    const example = invokeString(this.wasm, [region], (regionReference) =>
      this.wasm.getExampleNumber(...regionReference),
    );
    return example.length > 0 ? example : undefined;
  }

  /** Render the number in the requested format, or `undefined` when unparsable. */
  format(input: string, defaultRegion: RegionCode, format: PhoneNumberFormat): string | undefined {
    const formatted = invokeString(this.wasm, [input, defaultRegion], (inputReference, regionReference) =>
      this.wasm.format(...inputReference, ...regionReference, format),
    );
    return formatted.length > 0 ? formatted : undefined;
  }

  /** Format a (possibly partial) input as the user types it for `region`. */
  formatAsYouType(input: string, region: RegionCode): string {
    return invokeString(this.wasm, [input, region], (inputReference, regionReference) =>
      this.wasm.formatAsYouType(...inputReference, ...regionReference),
    );
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
