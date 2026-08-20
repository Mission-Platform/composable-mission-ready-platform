import type { MpHistory, MpHistoryEntry, MpHistoryEvent, MpHistoryListener } from '@mission-platform/router';

function notify(listeners: Set<MpHistoryListener>, event: MpHistoryEvent): void {
  for (const listener of listeners) {
    listener(event);
  }
}

/** A deterministic history implementation for tests, SSR, and prerendering. */
export class MpMemoryHistory implements MpHistory {
  private readonly entries: MpHistoryEntry[];
  private readonly listeners = new Set<MpHistoryListener>();
  private index: number;

  public constructor(initialUrl = '/') {
    this.entries = [{ url: initialUrl }];
    this.index = 0;
  }

  public get location(): string {
    return this.entries[this.index]?.url ?? '/';
  }

  public get state(): unknown {
    return this.entries[this.index]?.state;
  }

  public push(url: string, state?: unknown): void {
    const from = this.entries[this.index] as MpHistoryEntry;
    this.entries.splice(this.index + 1);
    this.entries.push({ url, state });
    this.index += 1;
    notify(this.listeners, { type: 'push', from, to: this.entries[this.index] as MpHistoryEntry });
  }

  public replace(url: string, state?: unknown): void {
    const from = this.entries[this.index] as MpHistoryEntry;
    this.entries[this.index] = { url, state };
    notify(this.listeners, { type: 'replace', from, to: this.entries[this.index] as MpHistoryEntry });
  }

  public back(): void {
    this.go(-1);
  }

  public forward(): void {
    this.go(1);
  }

  public go(delta: number): void {
    const next = Math.max(0, Math.min(this.entries.length - 1, this.index + delta));
    const from = this.entries[this.index] as MpHistoryEntry;
    if (next === this.index) {
      notify(this.listeners, {
        type: 'pop',
        from,
        to: from,
        delta: 0,
      });
      return;
    }
    const previousIndex = this.index;
    this.index = next;
    notify(this.listeners, {
      type: 'pop',
      from,
      to: this.entries[this.index] as MpHistoryEntry,
      delta: next - previousIndex,
    });
  }

  public listen(listener: MpHistoryListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** The current stack index, exposed for deterministic test assertions. */
  public get position(): number {
    return this.index;
  }
}

/** HTML5 browser history. It is only constructed in a browser context. */
export class MpBrowserHistory implements MpHistory {
  private readonly listeners = new Set<MpHistoryListener>();
  private readonly win: Window;
  private readonly onPopState = (): void => {
    const to = this.currentEntry();
    notify(this.listeners, { type: 'pop', from: this.previousEntry, to });
    this.previousEntry = to;
  };
  private previousEntry: MpHistoryEntry;

  public constructor(win: Window = globalThis.window) {
    this.win = win;
    this.previousEntry = this.currentEntry();
    this.win.addEventListener('popstate', this.onPopState);
  }

  public get location(): string {
    const { pathname, search, hash } = this.win.location;
    return `${pathname}${search}${hash}` || '/';
  }

  public get state(): unknown {
    return this.win.history.state;
  }

  public push(url: string, state?: unknown): void {
    const from = this.currentEntry();
    this.win.history.pushState(state, '', url);
    const to = this.currentEntry();
    notify(this.listeners, { type: 'push', from, to });
    this.previousEntry = to;
  }

  public replace(url: string, state?: unknown): void {
    const from = this.currentEntry();
    this.win.history.replaceState(state, '', url);
    const to = this.currentEntry();
    notify(this.listeners, { type: 'replace', from, to });
    this.previousEntry = to;
  }

  public back(): void {
    this.win.history.back();
  }

  public forward(): void {
    this.win.history.forward();
  }

  public go(delta: number): void {
    if (delta === 0) {
      const entry = this.currentEntry();
      notify(this.listeners, { type: 'pop', from: entry, to: entry, delta: 0 });
      this.previousEntry = entry;
      return;
    }
    this.win.history.go(delta);
  }

  public listen(listener: MpHistoryListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public dispose(): void {
    this.win.removeEventListener('popstate', this.onPopState);
    this.listeners.clear();
  }

  private currentEntry(): MpHistoryEntry {
    return { url: this.location, state: this.win.history.state };
  }
}

export function createWebHistory(): MpHistory {
  return globalThis.window === undefined ? new MpMemoryHistory() : new MpBrowserHistory();
}

export function createMemoryHistory(initialUrl = '/'): MpMemoryHistory {
  return new MpMemoryHistory(initialUrl);
}

export function createBrowserHistory(win?: Window): MpBrowserHistory {
  const browserWindow = win ?? globalThis.window;
  if (!browserWindow) {
    throw new Error('createBrowserHistory requires a browser Window');
  }
  return new MpBrowserHistory(browserWindow);
}
