import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createEditorChangeStream } from './editor-stream';

import type { EditorStats } from './text-stats';

describe('createEditorChangeStream', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('emits debounced, derived stats for the latest pushed content', () => {
    const stream = createEditorChangeStream({ debounceMs: 100 });
    const emissions: EditorStats[] = [];
    const subscription = stream.stats$.subscribe((stats) => emissions.push(stats));

    stream.push('<p>one</p>');
    stream.push('<p>one two</p>');
    stream.push('<p>one two three</p>');

    // Nothing before the debounce window elapses.
    expect(emissions).toHaveLength(0);

    vi.advanceTimersByTime(100);

    expect(emissions).toHaveLength(1);
    expect(emissions[0]?.words).toBe(3);

    subscription.unsubscribe();
    stream.destroy();
  });

  it('suppresses duplicate emissions when derived stats do not change', () => {
    const stream = createEditorChangeStream({ debounceMs: 50 });
    const emissions: EditorStats[] = [];
    const subscription = stream.stats$.subscribe((stats) => emissions.push(stats));

    stream.push('<p>same words</p>');
    vi.advanceTimersByTime(50);
    // Different HTML, identical visible text → identical stats → no new emission.
    stream.push('<div>same words</div>');
    vi.advanceTimersByTime(50);

    expect(emissions).toHaveLength(1);

    subscription.unsubscribe();
    stream.destroy();
  });
});
