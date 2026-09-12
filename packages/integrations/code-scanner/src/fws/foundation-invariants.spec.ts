import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const fwsDirectory = resolve(import.meta.dirname);

describe('ZXing foundation source contract', () => {
  const source = readFileSync(resolve(fwsDirectory, 'foundation.fws'), 'utf8');
  const scannerSource = readFileSync(resolve(fwsDirectory, 'scanner.fws'), 'utf8');

  it('keeps bounded records, statuses, and all public format ids in the source graph', () => {
    expect(source).toContain('FOUNDATION_MAX_ALLOCATION_BYTES');
    expect(source).toContain('FOUNDATION_MAX_POINTS');
    expect(source).toContain('foundation_validate_dimensions');
    expect(source).toContain('foundation_global_binarize');
    expect(source).toContain('foundation_hybrid_binarize');
    expect(source).toContain('foundation_sample_perspective');
    expect(source).toContain('foundation_reed_solomon_syndrome');
    expect(source).toContain('STATUS_INVALID_INPUT');
    expect(source).toContain('STATUS_CHECKSUM_ERROR');
    expect(source).toContain('FORMAT_RSS_EXPANDED');
    expect(source).toContain('FORMAT_UPC_E');
  });

  it('does not use allocation or capability imports in the foundation', () => {
    expect(source).not.toMatch(/import\s+"(?!\.\/common\.fws)[^"]+"/);
    expect(source).not.toMatch(/fws_(alloc|realloc|dealloc)/);
    expect(source).toContain('caller-owned');
  });

  it('keeps the foundation reachable from the static scanner entry graph', () => {
    expect(scannerSource).toContain('import "./foundation.fws" as foundation;');
    expect(scannerSource).toContain('sc_foundation_version');
    expect(scannerSource).toContain('sc_foundation_validate_outcome');
  });

  it('publishes the modified-source attribution boundary', () => {
    const notice = readFileSync(resolve(fwsDirectory, '..', '..', 'NOTICE'), 'utf8');
    const attribution = readFileSync(resolve(fwsDirectory, 'FOUNDATION-ATTRIBUTION.md'), 'utf8');
    expect(notice).toContain('Apache License, Version 2.0');
    expect(notice).toContain('modified');
    expect(attribution).toContain('LuminanceSource');
    expect(attribution).toContain('Reed–Solomon');
  });
});