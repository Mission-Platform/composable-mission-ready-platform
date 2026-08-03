import { Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { useSubscribe, useSubscription } from './use-subscription';

describe('useSubscription (neutral render-once baseline)', () => {
  it('does not run the subscribe factory during a single render', () => {
    const subscribe = vi.fn(() => ({ unsubscribe: vi.fn() }));

    // The baseline `useEffect` is a no-op, so the factory only runs once a
    // framework runtime executes the effect — never during the neutral render.
    useSubscription(subscribe);
    expect(subscribe).not.toHaveBeenCalled();
  });

  it('returns nothing (its value is the effect side-effect)', () => {
    expect(useSubscription(() => ({ unsubscribe: () => {} }))).toBeUndefined();
  });
});

describe('useSubscribe (neutral render-once baseline)', () => {
  it('does not subscribe during a single render', () => {
    const source = new Subject<number>();
    const subscribe = vi.spyOn(source, 'subscribe');

    useSubscribe(source, () => {});
    expect(subscribe).not.toHaveBeenCalled();
  });
});
