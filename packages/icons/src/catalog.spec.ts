import { describe, expect, it } from 'vitest';

import { ICON_CATALOG, validateIconCatalog } from './catalog';

describe('icon catalog', () => {
  it('contains the reviewed existing set with one category assignment per icon', () => {
    expect(ICON_CATALOG).toHaveLength(106);
    expect(new Set(ICON_CATALOG.map((entry) => entry.name)).size).toBe(106);
    expect(ICON_CATALOG.every((entry) => entry.category && entry.subcategory)).toBe(true);
  });

  it('rejects duplicate generated component basenames', () => {
    expect(() =>
      validateIconCatalog([
        {
          name: 'forge-icon-example-a',
          category: 'objects',
          subcategory: 'system',
          sourcePath: 'objects/system/forge-icon-example',
        },
        {
          name: 'forge-icon-example-b',
          category: 'navigation',
          subcategory: 'controls',
          sourcePath: 'navigation/controls/forge-icon-example',
        },
      ]),
    ).toThrow('Generated component basename collision');
  });
});
