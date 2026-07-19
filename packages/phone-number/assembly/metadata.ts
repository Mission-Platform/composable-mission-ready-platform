// Curated phone-number metadata, ported from Google libphonenumber.
//
// The upstream project ships an exhaustive, machine-generated metadata set for
// every ITU region. Reproducing all of it verbatim is out of scope for this
// AssemblyScript port, so this module encodes a representative, hand-verified
// subset of regions. The data model mirrors libphonenumber's concepts:
//
//   - countryCode         : ITU-T E.164 country calling code.
//   - nationalPrefix       : trunk prefix dialled domestically (stripped when
//                            parsing a national-format number, re-added when
//                            formatting in NATIONAL form).
//   - possibleLengths      : valid lengths of the national significant number
//                            (NSN) — the number without country code or trunk
//                            prefix. Used by `isPossibleNumber`.
//   - mobileLeading        : NSN leading-digit prefixes that identify a mobile
//                            line (used by `getNumberType`).
//   - fixedLeading         : NSN leading-digit prefixes that identify a fixed
//                            line. An empty list means "any remaining prefix".
//   - nationalFormatGroups : digit-group sizes used to render NATIONAL format.
//   - internationalGroups  : digit-group sizes used to render INTERNATIONAL
//                            format (after the "+<code> " prefix).
//   - exampleNsn           : a representative national significant number used
//                            by `getExampleNumber` (handy as a placeholder).

export class PhoneMetadata {
  regionCode: string;
  countryCode: i32;
  nationalPrefix: string;
  possibleLengths: i32[];
  mobileLeading: string[];
  fixedLeading: string[];
  nationalFormatGroups: i32[];
  internationalGroups: i32[];
  exampleNsn: string;

  constructor(
    regionCode: string,
    countryCode: i32,
    nationalPrefix: string,
    possibleLengths: i32[],
    mobileLeading: string[],
    fixedLeading: string[],
    nationalFormatGroups: i32[],
    internationalGroups: i32[],
    exampleNsn: string,
  ) {
    this.regionCode = regionCode;
    this.countryCode = countryCode;
    this.nationalPrefix = nationalPrefix;
    this.possibleLengths = possibleLengths;
    this.mobileLeading = mobileLeading;
    this.fixedLeading = fixedLeading;
    this.nationalFormatGroups = nationalFormatGroups;
    this.internationalGroups = internationalGroups;
    this.exampleNsn = exampleNsn;
  }
}

// Region code -> metadata.
export const REGION_METADATA = new Map<string, PhoneMetadata>();

// Country calling code -> primary region code. When several regions share a
// calling code (e.g. +1 for US/CA), the primary region is used for lookups.
export const CODE_TO_REGION = new Map<i32, string>();

// Ordered list of the supported region codes (registration order), exposed via
// `getSupportedRegions` so consumers can build a country picker.
export const REGION_LIST = new Array<string>();

function register(meta: PhoneMetadata, primaryForCode: bool): void {
  REGION_METADATA.set(meta.regionCode, meta);
  REGION_LIST.push(meta.regionCode);
  if (primaryForCode) {
    CODE_TO_REGION.set(meta.countryCode, meta.regionCode);
  }
}

// ---------------------------------------------------------------------------
// Region definitions.
// ---------------------------------------------------------------------------

register(
  new PhoneMetadata(
    'US',
    1,
    '1',
    [10],
    [], // North America has no dedicated mobile prefixes.
    [],
    [3, 3, 4],
    [3, 3, 4],
    '2015550123',
  ),
  true,
);

register(new PhoneMetadata('CA', 1, '1', [10], [], [], [3, 3, 4], [3, 3, 4], '5062345678'), false);

register(new PhoneMetadata('GB', 44, '0', [9, 10], ['7'], ['1', '2', '3', '8'], [4, 6], [4, 6], '7400123456'), true);

register(
  new PhoneMetadata(
    'FR',
    33,
    '0',
    [9],
    ['6', '7'],
    ['1', '2', '3', '4', '5', '8', '9'],
    [1, 2, 2, 2, 2],
    [1, 2, 2, 2, 2],
    '612345678',
  ),
  true,
);

register(
  new PhoneMetadata('DE', 49, '0', [7, 8, 9, 10, 11], ['15', '16', '17'], [], [4, 7], [4, 7], '1512345678'),
  true,
);

register(new PhoneMetadata('AU', 61, '0', [9], ['4'], ['2', '3', '7', '8'], [1, 4, 4], [1, 4, 4], '412345678'), true);

register(
  new PhoneMetadata('IN', 91, '0', [10], ['6', '7', '8', '9'], ['1', '2', '3', '4', '5'], [5, 5], [5, 5], '8123456789'),
  true,
);

register(
  new PhoneMetadata('JP', 81, '0', [9, 10], ['70', '80', '90'], ['3', '6'], [2, 4, 4], [2, 4, 4], '9012345678'),
  true,
);

register(
  new PhoneMetadata(
    'BR',
    55,
    '0',
    [10, 11],
    ['6', '7', '8', '9'],
    ['2', '3', '4', '5'],
    [2, 5, 4],
    [2, 5, 4],
    '1123456789',
  ),
  true,
);

register(new PhoneMetadata('CN', 86, '0', [11], ['1'], [], [3, 4, 4], [3, 4, 4], '13123456789'), true);

register(new PhoneMetadata('RU', 7, '8', [10], ['9'], ['3', '4', '8'], [3, 3, 2, 2], [3, 3, 2, 2], '9123456789'), true);
