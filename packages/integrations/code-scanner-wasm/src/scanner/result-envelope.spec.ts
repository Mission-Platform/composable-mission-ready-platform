import { describe, expect, it } from 'vitest';

import { parseResultEnvelope, resultEnvelopeLimits } from './result-envelope';

describe('scanner result envelope', () => {
  it('parses a decoded versioned result with its declared bit count', () => {
    expect(parseResultEnvelope('R10700000016payload')).toEqual({
      formatId: 7,
      decoded: true,
      numBits: 16,
      payload: 'payload',
    });
  });

  it('requires an empty payload for located-only results', () => {
    expect(parseResultEnvelope('R00700000000')).toEqual({
      formatId: 7,
      decoded: false,
      numBits: 0,
      payload: '',
    });
    expect(parseResultEnvelope('R00700000000payload')).toBeNull();
  });

  it('keeps legacy results readable during artifact migration', () => {
    expect(parseResultEnvelope('D07payload')).toEqual({
      formatId: 7,
      decoded: true,
      numBits: 0,
      payload: 'payload',
    });
    expect(parseResultEnvelope('L07')).toEqual({
      formatId: 7,
      decoded: false,
      numBits: 0,
      payload: '',
    });
  });

  it('rejects malformed fields, unknown formats, and oversized values', () => {
    expect(parseResultEnvelope('R1x7000000016payload')).toBeNull();
    expect(parseResultEnvelope('R1990000000016payload')).toBeNull();
    expect(parseResultEnvelope('R00700000001')).toBeNull();
    expect(parseResultEnvelope(`R10700000000${'x'.repeat(resultEnvelopeLimits.maxLength)}`)).toBeNull();
  });
});
