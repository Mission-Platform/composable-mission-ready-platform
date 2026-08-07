import { describe, expect, it } from 'vitest';

import { usePopup } from './use-popup';

describe('usePopup', () => {
  it('does not create a popup before the map is ready', () => {
    expect(usePopup(undefined, { content: 'Hello', lngLat: [0, 0] }).popup).toBeUndefined();
  });
});
