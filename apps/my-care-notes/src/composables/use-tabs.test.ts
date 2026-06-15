// AAA (Arrange–Act–Assert) unit tests for the useTabs composable.
// Covers: initial state, addTab, closeTab, updateTabContent, updateTabTitle,
//         setActiveTab, importTab, and 24-hour TTL filtering.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

import type { useTabs as UseTabsFunction } from './use-tabs';

// ─── Module reset between tests ───────────────────────────────────────────────
// useTabs holds module-level reactive state. We reset the module registry and
// localStorage before each test to obtain an isolated, clean slate.

let useTabs: typeof UseTabsFunction;

beforeEach(async () => {
  localStorage.clear();
  vi.resetModules();
  const module_ = await import('./use-tabs');
  useTabs = module_.useTabs;
});

// ─── initial state ────────────────────────────────────────────────────────────

describe('initial state', () => {
  it('creates a single default "Untitled" tab when localStorage is empty', () => {
    // Arrange & Act
    const { tabs, openTabs } = useTabs();

    // Assert
    expect(tabs.value).toHaveLength(1);
    expect(tabs.value[0].title).toBe('Untitled');
    expect(openTabs()).toHaveLength(1);
  });

  it('sets the active tab id to the default tab', () => {
    // Arrange & Act
    const { tabs, activeTabId } = useTabs();

    // Assert
    expect(activeTabId.value).toBe(tabs.value[0].id);
  });
});

// ─── addTab ───────────────────────────────────────────────────────────────────

describe('addTab', () => {
  it('adds a new Untitled tab and returns it', () => {
    // Arrange
    const { addTab, tabs } = useTabs();

    // Act
    const newTab = addTab();

    // Assert
    expect(tabs.value).toHaveLength(2);
    expect(newTab.title).toBe('Untitled');
    expect(newTab.content).toBe('');
  });

  it('makes the new tab the active tab', () => {
    // Arrange
    const { addTab, activeTabId } = useTabs();

    // Act
    const newTab = addTab();

    // Assert
    expect(activeTabId.value).toBe(newTab.id);
  });

  it('assigns a unique id and createdAt timestamp', () => {
    // Arrange
    const { addTab } = useTabs();

    // Act
    const tab = addTab();

    // Assert
    expect(tab.id).toBeTruthy();
    expect(tab.createdAt).toBeGreaterThan(0);
  });

  it('persists the new tab to localStorage after the reactive watcher flushes', async () => {
    // Arrange
    const { addTab } = useTabs();

    // Act
    addTab();
    await nextTick();

    // Assert
    const stored = JSON.parse(localStorage.getItem('my-care-notes:tabs') ?? '[]');
    expect(stored).toHaveLength(2);
  });
});

// ─── closeTab ─────────────────────────────────────────────────────────────────

describe('closeTab', () => {
  it('marks the tab as closed by setting closedAt', () => {
    // Arrange
    const { tabs, closeTab } = useTabs();
    const id = tabs.value[0].id;

    // Act
    closeTab(id);

    // Assert
    expect(tabs.value[0].closedAt).toBeGreaterThan(0);
  });

  it('removes closed tab from openTabs()', () => {
    // Arrange
    const { tabs, addTab, closeTab, openTabs } = useTabs();
    // Add a second tab so closing the first doesn't trigger auto-creation
    const second = addTab();
    const firstId = tabs.value[0].id;

    // Act
    closeTab(firstId);

    // Assert
    const open = openTabs();
    expect(open.every((t) => t.id !== firstId)).toBe(true);
    expect(open.some((t) => t.id === second.id)).toBe(true);
  });

  it('creates a new default tab when the last open tab is closed', () => {
    // Arrange
    const { tabs, closeTab, openTabs } = useTabs();
    const id = tabs.value[0].id;

    // Act
    closeTab(id);

    // Assert — a brand-new open tab was created automatically
    expect(openTabs()).toHaveLength(1);
    expect(tabs.value.length).toBeGreaterThanOrEqual(2);
  });

  it('switches active tab to the nearest open neighbour when active tab is closed', () => {
    // Arrange
    const { addTab, closeTab, activeTabId } = useTabs();
    const second = addTab();
    const thirdId = addTab().id;
    // At this point openTabs() = [default, second, third]
    // closing third: closingIndex=2, neighbour = openBefore[1] = second

    // Act
    closeTab(thirdId);

    // Assert
    expect(activeTabId.value).toBe(second.id);
  });

  it('switches active tab to a valid open neighbour when previously-closed tabs precede the active tab', () => {
    // Arrange — simulate a tab that was closed earlier in the session (still within TTL)
    // tabs.value = [previously-closed(idx0), open_tab_A(idx1), active_open_tab_B(idx2)]
    // openTabs() = [tab_A, tab_B]; closing tab_B: closingIndex=1, neighbour = openBefore[0] = tab_A
    const { tabs, addTab, closeTab, activeTabId } = useTabs();
    const tabA = addTab();
    const tabB = addTab();

    // Close the default tab to simulate a previously-closed tab in the array
    closeTab(tabs.value[0].id);

    // Make tab_B active and close it — the previously-closed default tab is at idx 0
    activeTabId.value = tabB.id;

    // Act
    closeTab(tabB.id);

    // Assert — must resolve to a valid open tab (tabA), not undefined
    expect(activeTabId.value).toBe(tabA.id);
  });

  it('closes the correct tab by id regardless of its position in the array', () => {
    // Arrange — three open tabs; close the middle one by id
    const { tabs, addTab, closeTab, openTabs } = useTabs();
    const second = addTab();
    addTab();
    // tabs: [default(0), second(1), third(2)]

    // Act — close the middle tab using its id
    closeTab(second.id);

    // Assert — only the tab with that id is marked closed; the others remain open
    expect(tabs.value.find((t) => t.id === second.id)?.closedAt).toBeGreaterThan(0);
    const open = openTabs();
    expect(open.every((t) => t.id !== second.id)).toBe(true);
    expect(open).toHaveLength(2);
  });

  it('does nothing when the id does not exist', () => {
    // Arrange
    const { tabs, closeTab } = useTabs();
    const before = tabs.value.length;

    // Act
    closeTab('non-existent-id');

    // Assert — no state change
    expect(tabs.value.length).toBe(before);
  });
});

// ─── updateTabContent ─────────────────────────────────────────────────────────

describe('updateTabContent', () => {
  it('updates the content of the specified tab', () => {
    // Arrange
    const { tabs, updateTabContent } = useTabs();
    const id = tabs.value[0].id;

    // Act
    updateTabContent(id, 'new content here');

    // Assert
    expect(tabs.value[0].content).toBe('new content here');
  });

  it('does not change other tabs', () => {
    // Arrange
    const { tabs, addTab, updateTabContent } = useTabs();
    const firstId = tabs.value[0].id;
    const secondId = addTab().id;

    // Act
    updateTabContent(secondId, 'only second updated');

    // Assert
    expect(tabs.value.find((t) => t.id === firstId)?.content).toBe('');
    expect(tabs.value.find((t) => t.id === secondId)?.content).toBe('only second updated');
  });
});

// ─── updateTabTitle ───────────────────────────────────────────────────────────

describe('updateTabTitle', () => {
  it('updates the title of the specified tab', () => {
    // Arrange
    const { tabs, updateTabTitle } = useTabs();
    const id = tabs.value[0].id;

    // Act
    updateTabTitle(id, 'My Note');

    // Assert
    expect(tabs.value[0].title).toBe('My Note');
  });

  it('does not modify other tabs', () => {
    // Arrange
    const { tabs, addTab, updateTabTitle } = useTabs();
    const firstId = tabs.value[0].id;
    const secondId = addTab().id;

    // Act
    updateTabTitle(firstId, 'Renamed First');

    // Assert
    expect(tabs.value.find((t) => t.id === firstId)?.title).toBe('Renamed First');
    expect(tabs.value.find((t) => t.id === secondId)?.title).toBe('Untitled');
  });
});

// ─── setActiveTab ─────────────────────────────────────────────────────────────

describe('setActiveTab', () => {
  it('changes the active tab id', () => {
    // Arrange
    const { tabs, addTab, setActiveTab, activeTabId } = useTabs();
    const firstId = tabs.value[0].id;
    addTab(); // active is now new tab

    // Act
    setActiveTab(firstId);

    // Assert
    expect(activeTabId.value).toBe(firstId);
  });

  it('updates the reactive activeTabId ref so the new id is readable on the next tick', async () => {
    // Arrange — add a second tab so we can switch back to the first
    const { tabs, addTab, setActiveTab, activeTabId } = useTabs();
    const firstId = tabs.value[0].id;
    addTab(); // active is now the new second tab

    // Act
    setActiveTab(firstId);
    await nextTick();

    // Assert — the reactive ref reflects the change synchronously
    expect(activeTabId.value).toBe(firstId);
  });
});

// ─── importTab ────────────────────────────────────────────────────────────────

describe('importTab', () => {
  it('creates a new tab from the imported file', async () => {
    // Arrange
    const { importTab, tabs } = useTabs();
    const file = new File(['# Hello'], 'my-note.md', { type: 'text/markdown' });

    // Act
    const tab = await importTab(file);

    // Assert
    expect(tab.title).toBe('my-note');
    expect(tab.content).toBe('# Hello');
    expect(tabs.value.some((t) => t.id === tab.id)).toBe(true);
  });

  it('makes the imported tab the active tab', async () => {
    // Arrange
    const { importTab, activeTabId } = useTabs();
    const file = new File(['content'], 'imported.md', { type: 'text/markdown' });

    // Act
    const tab = await importTab(file);

    // Assert
    expect(activeTabId.value).toBe(tab.id);
  });

  it('strips the .md extension from the file name for the title', async () => {
    // Arrange
    const { importTab } = useTabs();
    const file = new File(['body'], 'daily-notes.md', { type: 'text/markdown' });

    // Act
    const tab = await importTab(file);

    // Assert
    expect(tab.title).toBe('daily-notes');
  });
});

// ─── openTabs ─────────────────────────────────────────────────────────────────

describe('openTabs', () => {
  it('only returns tabs that have no closedAt timestamp', () => {
    // Arrange
    const { addTab, closeTab, openTabs, tabs } = useTabs();
    addTab();
    addTab();
    const closeId = tabs.value[1].id;

    // Act
    closeTab(closeId);

    // Assert
    const open = openTabs();
    expect(open.every((t) => !t.closedAt)).toBe(true);
  });
});

// ─── TTL filtering (24-hour rule) ─────────────────────────────────────────────

describe('TTL filtering', () => {
  it('discards tabs closed more than 24 hours ago when loading from storage', async () => {
    // Arrange — manually write a stale closed tab to localStorage
    const staleTab = {
      id: 'stale-id',
      title: 'Old Note',
      content: 'stale',
      createdAt: Date.now() - 48 * 60 * 60 * 1000, // 48 h ago
      closedAt: Date.now() - 25 * 60 * 60 * 1000, // closed 25 h ago
    };
    const freshTab = {
      id: 'fresh-id',
      title: 'Recent Note',
      content: 'fresh',
      createdAt: Date.now() - 2 * 60 * 60 * 1000, // 2 h ago
    };
    localStorage.setItem('my-care-notes:tabs', JSON.stringify([staleTab, freshTab]));
    localStorage.setItem('my-care-notes:active-tab', freshTab.id);

    // Act — re-import after setting up localStorage to trigger loadFromStorage
    vi.resetModules();
    const module_ = await import('./use-tabs');
    const { tabs } = module_.useTabs();

    // Assert — only the fresh tab survives
    expect(tabs.value.some((t) => t.id === 'stale-id')).toBe(false);
    expect(tabs.value.some((t) => t.id === 'fresh-id')).toBe(true);
  });

  it('keeps tabs closed less than 24 hours ago', async () => {
    // Arrange
    const recentlyClosedTab = {
      id: 'recent-closed',
      title: 'Nearly Gone',
      content: 'body',
      createdAt: Date.now() - 12 * 60 * 60 * 1000,
      closedAt: Date.now() - 60 * 60 * 1000, // 1 h ago — within TTL
    };
    localStorage.setItem('my-care-notes:tabs', JSON.stringify([recentlyClosedTab]));
    localStorage.setItem('my-care-notes:active-tab', recentlyClosedTab.id);

    // Act
    vi.resetModules();
    const module_ = await import('./use-tabs');
    const { tabs } = module_.useTabs();

    // Assert
    expect(tabs.value.some((t) => t.id === 'recent-closed')).toBe(true);
  });
});
