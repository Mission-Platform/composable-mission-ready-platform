import { describe, expect, it } from 'vitest';

import { load as loadDataBar, loadSync as loadDataBarSync } from './databar.fws';
import { dataBarFixture } from './fws.fixtures';

describe('GS1 DataBar/RSS-14 FWS slice', () => {
  it('validates GTIN-14 values through synchronous and asynchronous loaders', async () => {
    const dataBar = loadDataBarSync();

    expect(Boolean(dataBar.validate_databar_gtin(dataBarFixture.valid))).toBe(true);
    expect(Boolean(dataBar.validate_databar_gtin(dataBarFixture.invalid))).toBe(false);
    await expect(
      loadDataBar().then((loaded) => Boolean(loaded.validate_databar_gtin(dataBarFixture.valid))),
    ).resolves.toBe(true);
    await expect(
      loadDataBar().then((loaded) => Boolean(loaded.validate_databar_gtin(dataBarFixture.invalid))),
    ).resolves.toBe(false);
  });
});
