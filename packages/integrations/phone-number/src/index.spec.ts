import { beforeAll, describe, expect, it } from 'vitest';

import {
  getPhoneNumberUtil,
  getPhoneNumberUtilSync,
  PhoneNumberFormat,
  PhoneNumberType,
  type PhoneNumberUtil,
} from './index';

let util: PhoneNumberUtil;

beforeAll(async () => {
  util = await getPhoneNumberUtil();
});

describe('region / country-code metadata', () => {
  it('maps regions to calling codes', () => {
    expect(util.getCountryCodeForRegion('US')).toBe(1);
    expect(util.getCountryCodeForRegion('GB')).toBe(44);
    expect(util.getCountryCodeForRegion('FR')).toBe(33);
    expect(util.getCountryCodeForRegion('RU')).toBe(7);
  });

  it('returns 0 for unknown regions', () => {
    expect(util.getCountryCodeForRegion('ZZ')).toBe(0);
  });

  it('maps calling codes to their primary region', () => {
    expect(util.getRegionCodeForCountryCode(1)).toBe('US');
    expect(util.getRegionCodeForCountryCode(44)).toBe('GB');
    expect(util.getRegionCodeForCountryCode(999)).toBeUndefined();
  });
});

describe('parsing', () => {
  it('strips the trunk prefix from national numbers', () => {
    expect(util.getNationalSignificantNumber('1-415-555-2671', 'US')).toBe('4155552671');
    expect(util.getNationalSignificantNumber('07911 123456', 'GB')).toBe('7911123456');
    expect(util.getNationalSignificantNumber('8 (999) 123-45-67', 'RU')).toBe('9991234567');
  });

  it('parses international (+ and 00/011) forms regardless of default region', () => {
    expect(util.getRegionCodeForNumber('+44 20 7946 0958', 'US')).toBe('GB');
    expect(util.getRegionCodeForNumber('004420 7946 0958', 'US')).toBe('GB');
    expect(util.getRegionCodeForNumber('011 44 20 7946 0958', 'US')).toBe('GB');
    expect(util.getRegionCodeForNumber('+33612345678', 'US')).toBe('FR');
  });

  it('returns undefined for unparsable input', () => {
    expect(util.getRegionCodeForNumber('', 'US')).toBeUndefined();
    expect(util.getRegionCodeForNumber('not-a-number', 'US')).toBeUndefined();
    expect(util.getRegionCodeForNumber('+9990000000', 'US')).toBeUndefined();
  });
});

describe('possibility vs. validity', () => {
  it('accepts valid numbers', () => {
    expect(util.isValidNumber('+14155552671', 'US')).toBe(true);
    expect(util.isValidNumber('07911 123456', 'GB')).toBe(true);
    expect(util.isValidNumber('06 12 34 56 78', 'FR')).toBe(true);
  });

  it('rejects numbers with an impossible length', () => {
    expect(util.isPossibleNumber('12345', 'US')).toBe(false);
    expect(util.isValidNumber('12345', 'US')).toBe(false);
  });

  it('distinguishes possible-but-invalid numbers', () => {
    // GB leading "5" has a plausible length but no assigned fixed/mobile range.
    expect(util.isPossibleNumber('05001234567', 'GB')).toBe(true);
    expect(util.isValidNumber('05001234567', 'GB')).toBe(false);
  });
});

describe('number type classification', () => {
  it('detects mobile ranges', () => {
    expect(util.getNumberType('07911 123456', 'GB')).toBe(PhoneNumberType.MOBILE);
    expect(util.getNumberType('06 12 34 56 78', 'FR')).toBe(PhoneNumberType.MOBILE);
    expect(util.getNumberType('+49 151 12345678', 'DE')).toBe(PhoneNumberType.MOBILE);
  });

  it('detects fixed-line ranges', () => {
    expect(util.getNumberType('020 7946 0958', 'GB')).toBe(PhoneNumberType.FIXED_LINE);
    expect(util.getNumberType('+49 30 1234567', 'DE')).toBe(PhoneNumberType.FIXED_LINE);
  });

  it('reports FIXED_LINE_OR_MOBILE where ranges are shared (NANP)', () => {
    expect(util.getNumberType('+14155552671', 'US')).toBe(PhoneNumberType.FIXED_LINE_OR_MOBILE);
  });

  it('returns UNKNOWN for unparsable input', () => {
    expect(util.getNumberType('nope', 'US')).toBe(PhoneNumberType.UNKNOWN);
  });
});

describe('formatting', () => {
  it('formats US numbers in every supported format', () => {
    expect(util.format('(415) 555-2671', 'US', PhoneNumberFormat.E164)).toBe('+14155552671');
    expect(util.format('4155552671', 'US', PhoneNumberFormat.NATIONAL)).toBe('(415) 555-2671');
    expect(util.format('4155552671', 'US', PhoneNumberFormat.INTERNATIONAL)).toBe('+1 415 555 2671');
    expect(util.format('4155552671', 'US', PhoneNumberFormat.RFC3966)).toBe('tel:+14155552671');
  });

  it('formats GB and FR numbers', () => {
    expect(util.format('07911 123456', 'GB', PhoneNumberFormat.E164)).toBe('+447911123456');
    expect(util.format('07911 123456', 'GB', PhoneNumberFormat.INTERNATIONAL)).toBe('+44 7911 123456');
    expect(util.format('06 12 34 56 78', 'FR', PhoneNumberFormat.NATIONAL)).toBe('06 12 34 56 78');
    expect(util.format('06 12 34 56 78', 'FR', PhoneNumberFormat.E164)).toBe('+33612345678');
  });

  it('round-trips an international number through E164', () => {
    expect(util.format('+44 20 7946 0958', 'US', PhoneNumberFormat.E164)).toBe('+442079460958');
  });

  it('returns undefined for unparsable input', () => {
    expect(util.format('', 'US', PhoneNumberFormat.E164)).toBeUndefined();
  });
});

describe('supported regions and example numbers', () => {
  it('lists every supported region', () => {
    const regions = util.getSupportedRegions();
    expect(regions).toContain('US');
    expect(regions).toContain('GB');
    expect(regions).toContain('RU');
    expect(regions.length).toBeGreaterThanOrEqual(11);
  });

  it('provides example numbers that format nationally', () => {
    const example = util.getExampleNumber('US');
    expect(example).toBe('+12015550123');
    expect(util.format(example!, 'US', PhoneNumberFormat.NATIONAL)).toBe('(201) 555-0123');
    expect(util.getExampleNumber('ZZ')).toBeUndefined();
  });
});

describe('validity for a specific region', () => {
  it('accepts a number that belongs to the region', () => {
    expect(util.isValidNumberForRegion('(415) 555-2671', 'US')).toBe(true);
    expect(util.isValidNumberForRegion('07911 123456', 'GB')).toBe(true);
  });

  it('rejects numbers of the wrong region or impossible length', () => {
    expect(util.isValidNumberForRegion('123', 'US')).toBe(false);
    expect(util.isValidNumberForRegion('+44 20 7946 0958', 'US')).toBe(false);
  });
});

describe('as-you-type formatting', () => {
  it('progressively formats a NANP number', () => {
    expect(util.formatAsYouType('415', 'US')).toBe('415');
    expect(util.formatAsYouType('415555', 'US')).toBe('(415) 555');
    expect(util.formatAsYouType('4155552671', 'US')).toBe('(415) 555-2671');
  });

  it('ignores separators and formats generic regions with their trunk prefix', () => {
    expect(util.formatAsYouType('(415) 5', 'US')).toBe('(415) 5');
    expect(util.formatAsYouType('07400123456', 'GB')).toBe('07400 123456');
  });

  it('passes international input through with a leading +', () => {
    expect(util.formatAsYouType('+14155552671', 'US')).toBe('+14155552671');
  });

  it('returns an empty string when there are no digits', () => {
    expect(util.formatAsYouType('', 'US')).toBe('');
  });
});

describe('synchronous instance', () => {
  it('exposes the same API without awaiting wasm', () => {
    const sync = getPhoneNumberUtilSync();
    expect(sync.getCountryCodeForRegion('US')).toBe(1);
    expect(sync.isValidNumberForRegion('(415) 555-2671', 'US')).toBe(true);
    expect(sync.format('4155552671', 'US', PhoneNumberFormat.NATIONAL)).toBe('(415) 555-2671');
    expect(sync.getSupportedRegions()).toContain('GB');
    expect(getPhoneNumberUtilSync()).toBe(sync);
  });
});
