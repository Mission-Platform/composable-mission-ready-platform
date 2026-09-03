/**
 * RxJS-backed change pipeline for the WYSIWYG editor.
 *
 * The editor pushes its raw HTML into a {@link Subject} on every input; the
 * stream debounces those bursts, derives {@link EditorStats}, and only emits
 * when the derived stats actually change. This keeps the reactive plumbing
 * framework-neutral (plain RxJS Observables) so the same source compiles to both
 * the Vue and React builds — consumers can bridge the exposed Observable into
 * component state with `@mission-platform/rxjs`'s `useObservable`.
 */
import { distinctUntilChanged, map, type Observable, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

import { computeStats, type EditorStats } from './text-stats';

/** A live editor change pipeline. */
export interface EditorChangeStream {
  /** Push the editor's latest HTML into the pipeline. */
  readonly push: (html: string) => void;
  /** A debounced stream of derived statistics for the pushed content. */
  readonly stats$: Observable<EditorStats>;
  /** The raw (undebounced) stream of pushed HTML. */
  readonly html$: Observable<string>;
  /** Tear the pipeline down (completes both streams). */
  readonly destroy: () => void;
}

/** Options controlling an {@link EditorChangeStream}. */
export interface EditorChangeStreamOptions {
  /** Debounce window in milliseconds before stats are recomputed. Defaults to `200`. */
  readonly debounceMs?: number;
}

const DEFAULT_DEBOUNCE_MS = 200;

/** Compare two {@link EditorStats} for equality (used to suppress duplicate emissions). */
function statsEqual(a: EditorStats, b: EditorStats): boolean {
  return a.words === b.words && a.characters === b.characters && a.charactersNoSpaces === b.charactersNoSpaces;
}

/**
 * Create an {@link EditorChangeStream}. The returned `stats$` observable is
 * cold-shared through the underlying {@link Subject}: subscribe to it, then feed
 * content through `push`.
 */
export function createEditorChangeStream(options: EditorChangeStreamOptions = {}): EditorChangeStream {
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const source = new Subject<string>();

  const stats$ = source.pipe(
    debounceTime(debounceMs),
    map((html) => computeStats(html)),
    distinctUntilChanged(statsEqual),
  );

  return {
    push: (html: string): void => source.next(html),
    stats$,
    html$: source.asObservable(),
    destroy: (): void => source.complete(),
  };
}
