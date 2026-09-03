export type ForgeString = readonly [pointer: number, length: number];

export interface ForgePhoneNumberExports {
  readonly memory: WebAssembly.Memory;
  readonly fws_alloc: (size: number) => number;
  readonly fws_dealloc: (pointer: number, size: number) => void;
  readonly fws_realloc: (pointer: number, oldSize: number, newSize: number) => number;
  readonly fws_reset: () => void;
  readonly getCountryCodeForRegion: (region: string) => number;
  readonly getRegionCodeForCountryCode: (code: number) => string;
  readonly getRegionCodeForNumber: (input: string, region: string) => string;
  readonly getNationalSignificantNumber: (input: string, region: string) => string;
  readonly isPossibleNumber: (input: string, region: string) => boolean;
  readonly isValidNumber: (input: string, region: string) => boolean;
  readonly isValidNumberForRegion: (input: string, region: string) => boolean;
  readonly getNumberType: (input: string, region: string) => number;
  readonly getSupportedRegions: () => string;
  readonly getExampleNumber: (region: string) => string;
  readonly format: (input: string, region: string, format: number) => string;
  readonly formatAsYouType: (input: string, region: string) => string;
}

export const manifest: Readonly<Record<string, unknown>>;
export function load(): Promise<ForgePhoneNumberExports>;
export function loadSync(): ForgePhoneNumberExports;
