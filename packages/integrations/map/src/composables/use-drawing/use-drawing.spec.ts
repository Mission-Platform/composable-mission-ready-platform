import { describe, expect, it } from 'vitest';

import { useDrawing } from './use-drawing';

describe('useDrawing', () => {
  it('starts idle when no map is available', () => {
    const drawing = useDrawing();

    expect(drawing.mode).toBeUndefined();
    expect(drawing.features.features).toHaveLength(0);
    expect(drawing.geodesic).toBe(true);
  });
});
