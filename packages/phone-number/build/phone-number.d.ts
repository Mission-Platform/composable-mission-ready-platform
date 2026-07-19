/** Exported memory */
export declare const memory: WebAssembly.Memory;
// Exported runtime interface
export declare function __new(size: number, id: number): number;
export declare function __pin(ptr: number): number;
export declare function __unpin(ptr: number): void;
export declare function __collect(): void;
export declare const __rtti_base: number;
/** assembly/index/NumberType */
export declare enum NumberType {
  /** @type `i32` */
  FIXED_LINE,
  /** @type `i32` */
  MOBILE,
  /** @type `i32` */
  FIXED_LINE_OR_MOBILE,
  /** @type `i32` */
  UNKNOWN,
}
/** assembly/index/PhoneNumberFormat */
export declare enum PhoneNumberFormat {
  /** @type `i32` */
  E164,
  /** @type `i32` */
  INTERNATIONAL,
  /** @type `i32` */
  NATIONAL,
  /** @type `i32` */
  RFC3966,
}
/**
 * assembly/index/getCountryCodeForRegion
 * @param region `~lib/string/String`
 * @returns `i32`
 */
export declare function getCountryCodeForRegion(region: string): number;
/**
 * assembly/index/getRegionCodeForCountryCode
 * @param code `i32`
 * @returns `~lib/string/String`
 */
export declare function getRegionCodeForCountryCode(code: number): string;
/**
 * assembly/index/getRegionCodeForNumber
 * @param input `~lib/string/String`
 * @param defaultRegion `~lib/string/String`
 * @returns `~lib/string/String`
 */
export declare function getRegionCodeForNumber(input: string, defaultRegion: string): string;
/**
 * assembly/index/getNationalSignificantNumber
 * @param input `~lib/string/String`
 * @param defaultRegion `~lib/string/String`
 * @returns `~lib/string/String`
 */
export declare function getNationalSignificantNumber(input: string, defaultRegion: string): string;
/**
 * assembly/index/isPossibleNumber
 * @param input `~lib/string/String`
 * @param defaultRegion `~lib/string/String`
 * @returns `bool`
 */
export declare function isPossibleNumber(input: string, defaultRegion: string): boolean;
/**
 * assembly/index/isValidNumber
 * @param input `~lib/string/String`
 * @param defaultRegion `~lib/string/String`
 * @returns `bool`
 */
export declare function isValidNumber(input: string, defaultRegion: string): boolean;
/**
 * assembly/index/isValidNumberForRegion
 * @param input `~lib/string/String`
 * @param region `~lib/string/String`
 * @returns `bool`
 */
export declare function isValidNumberForRegion(input: string, region: string): boolean;
/**
 * assembly/index/getSupportedRegions
 * @returns `~lib/string/String`
 */
export declare function getSupportedRegions(): string;
/**
 * assembly/index/getExampleNumber
 * @param region `~lib/string/String`
 * @returns `~lib/string/String`
 */
export declare function getExampleNumber(region: string): string;
/**
 * assembly/index/getNumberType
 * @param input `~lib/string/String`
 * @param defaultRegion `~lib/string/String`
 * @returns `i32`
 */
export declare function getNumberType(input: string, defaultRegion: string): number;
/**
 * assembly/index/format
 * @param input `~lib/string/String`
 * @param defaultRegion `~lib/string/String`
 * @param fmt `i32`
 * @returns `~lib/string/String`
 */
export declare function format(input: string, defaultRegion: string, fmt: number): string;
/**
 * assembly/index/formatAsYouType
 * @param input `~lib/string/String`
 * @param region `~lib/string/String`
 * @returns `~lib/string/String`
 */
export declare function formatAsYouType(input: string, region: string): string;
/**
 * assembly/regex/reTest
 * @param program `~lib/typedarray/Int32Array`
 * @param classes `~lib/typedarray/Int32Array`
 * @param groupCount `i32`
 * @param input `~lib/string/String`
 * @param requireEnd `bool`
 * @returns `i32`
 */
export declare function reTest(program: Int32Array, classes: Int32Array, groupCount: number, input: string, requireEnd: boolean): number;
/**
 * assembly/regex/reCaptures
 * @param program `~lib/typedarray/Int32Array`
 * @param classes `~lib/typedarray/Int32Array`
 * @param groupCount `i32`
 * @param input `~lib/string/String`
 * @param start `i32`
 * @param requireEnd `bool`
 * @returns `~lib/typedarray/Int32Array`
 */
export declare function reCaptures(program: Int32Array, classes: Int32Array, groupCount: number, input: string, start: number, requireEnd: boolean): Int32Array;
