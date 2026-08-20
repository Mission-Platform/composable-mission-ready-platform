export type ForgeString = readonly [pointer: number, length: number];

export interface ForgePhoneNumberExports {
  readonly memory: WebAssembly.Memory;
  readonly fws_alloc: (size: number) => number;
  readonly fws_dealloc: (pointer: number, size: number) => void;
  readonly fws_realloc: (pointer: number, oldSize: number, newSize: number) => number;
  readonly fws_reset: () => void;
  readonly getCountryCodeForRegion: (regionPointer: number, regionLength: number) => number;
  readonly getRegionCodeForCountryCode: (code: number) => ForgeString;
  readonly getRegionCodeForNumber: (
    inputPointer: number,
    inputLength: number,
    regionPointer: number,
    regionLength: number,
  ) => ForgeString;
  readonly getNationalSignificantNumber: (
    inputPointer: number,
    inputLength: number,
    regionPointer: number,
    regionLength: number,
  ) => ForgeString;
  readonly isPossibleNumber: (
    inputPointer: number,
    inputLength: number,
    regionPointer: number,
    regionLength: number,
  ) => boolean;
  readonly isValidNumber: (
    inputPointer: number,
    inputLength: number,
    regionPointer: number,
    regionLength: number,
  ) => boolean;
  readonly isValidNumberForRegion: (
    inputPointer: number,
    inputLength: number,
    regionPointer: number,
    regionLength: number,
  ) => boolean;
  readonly getNumberType: (
    inputPointer: number,
    inputLength: number,
    regionPointer: number,
    regionLength: number,
  ) => number;
  readonly getSupportedRegions: () => ForgeString;
  readonly getExampleNumber: (regionPointer: number, regionLength: number) => ForgeString;
  readonly format: (
    inputPointer: number,
    inputLength: number,
    regionPointer: number,
    regionLength: number,
    format: number,
  ) => ForgeString;
  readonly formatAsYouType: (
    inputPointer: number,
    inputLength: number,
    regionPointer: number,
    regionLength: number,
  ) => ForgeString;
}

export const manifest: Readonly<Record<string, unknown>>;
export function load(): Promise<ForgePhoneNumberExports>;
export function loadSync(): ForgePhoneNumberExports;
