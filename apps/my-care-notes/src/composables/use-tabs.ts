import { nanoid } from 'nanoid';
import { computed, ref, watch } from 'vue';

import type { NoteTab } from '../types';

const STORAGE_KEY = 'my-care-notes:tabs';
const ACTIVE_TAB_KEY = 'my-care-notes:active-tab';
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Load persisted tabs from `localStorage`, dropping any tabs whose soft-close TTL has expired. */
function loadFromStorage(): NoteTab[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw) as NoteTab[];
    const now = Date.now();
    // Remove tabs that were closed more than 24 hours ago
    return all.filter((tab) => !tab.closedAt || now - tab.closedAt < TTL_MS);
  } catch {
    return [];
  }
}

/** Persist the current tabs array to `localStorage` under {@link STORAGE_KEY}. */
function saveToStorage(tabs: NoteTab[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
}

/** Create a new untitled, empty `NoteTab` with a generated id and current timestamp. */
function createDefaultTab(): NoteTab {
  return {
    id: nanoid(),
    title: 'Untitled',
    content: '',
    createdAt: Date.now(),
  };
}

const storedTabs = loadFromStorage();
const tabs = ref<NoteTab[]>(storedTabs.length > 0 ? storedTabs : [createDefaultTab()]);

const storedActiveId = localStorage.getItem(ACTIVE_TAB_KEY);
const activeTabId = ref<string>(
  storedActiveId && tabs.value.some((t) => t.id === storedActiveId) ? storedActiveId : tabs.value[0].id,
);

watch(
  tabs,
  (newTabs) => {
    saveToStorage(newTabs);
  },
  { deep: true },
);

watch(activeTabId, (id) => {
  localStorage.setItem(ACTIVE_TAB_KEY, id);
});

/**
 * Composable exposing the My Care Notes tab model: the reactive list of open/closed tabs,
 * the currently active tab id, and the operations that mutate them. State is shared across
 * all callers (module-level refs) and persisted to `localStorage`.
 */
export function useTabs() {
  /** Return the subset of tabs that are currently open (i.e. not soft-closed). */
  function openTabs() {
    return tabs.value.filter((t) => !t.closedAt);
  }

  const closedTabs = computed(() =>
    tabs.value
      .filter((t): t is NoteTab & { closedAt: number } => typeof t.closedAt === 'number')
      .toSorted((a, b) => b.closedAt - a.closedAt),
  );

  /** Restore a previously soft-closed tab by id and make it the active tab. No-op if the tab is unknown or already open. */
  function restoreTab(id: string): void {
    const tab = tabs.value.find((t) => t.id === id);
    if (!tab || !tab.closedAt) return;
    tabs.value = tabs.value.map((t) => (t.id === id ? { ...t, closedAt: undefined } : t));
    activeTabId.value = id;
  }

  /** Permanently remove a tab by id. If it was active, activates a neighbour or creates a fresh default tab when none remain. */
  function removeTab(id: string): void {
    tabs.value = tabs.value.filter((t) => t.id !== id);
    if (activeTabId.value === id) {
      const next = openTabs()[0];
      if (next) {
        activeTabId.value = next.id;
      } else {
        const newTab = createDefaultTab();
        tabs.value = [...tabs.value, newTab];
        activeTabId.value = newTab.id;
      }
    }
  }

  /** Append a new default tab, activate it, and return the created tab. */
  function addTab(): NoteTab {
    const tab = createDefaultTab();
    tabs.value = [...tabs.value, tab];
    activeTabId.value = tab.id;
    return tab;
  }

  /** Soft-close a tab (sets `closedAt`) so it can be restored within the TTL. Activates a neighbour when closing the active tab. */
  function closeTab(id: string): void {
    if (!tabs.value.some((t) => t.id === id)) return;

    if (activeTabId.value === id) {
      // Capture the open-tabs snapshot and resolve the neighbour's ID before closing
      const openBefore = openTabs();
      const closingIndex = openBefore.findIndex((t) => t.id === id);
      const neighbourId = openBefore[closingIndex - 1]?.id ?? openBefore[closingIndex + 1]?.id;

      tabs.value = tabs.value.map((t) => (t.id === id ? { ...t, closedAt: Date.now() } : t));

      if (neighbourId) {
        activeTabId.value = neighbourId;
      } else {
        // No open tabs left — create a new one
        const newTab = createDefaultTab();
        tabs.value = [...tabs.value, newTab];
        activeTabId.value = newTab.id;
      }
    } else {
      tabs.value = tabs.value.map((t) => (t.id === id ? { ...t, closedAt: Date.now() } : t));
    }
  }

  /** Replace the markdown `content` of the tab with the given id. No-op for unknown ids. */
  function updateTabContent(id: string, content: string): void {
    tabs.value = tabs.value.map((t) => (t.id === id ? { ...t, content } : t));
  }

  /** Replace the display `title` of the tab with the given id. No-op for unknown ids. */
  function updateTabTitle(id: string, title: string): void {
    tabs.value = tabs.value.map((t) => (t.id === id ? { ...t, title } : t));
  }

  /** Set the currently active tab by id. Assumes the id exists in {@link tabs}. */
  function setActiveTab(id: string): void {
    activeTabId.value = id;
  }

  /** Trigger a browser download of the tab's content as a `.md` file named after its title. */
  function exportTab(id: string): void {
    const tab = tabs.value.find((t) => t.id === id);
    if (!tab) return;

    const blob = new Blob([tab.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tab.title}.md`;
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  /** Import a markdown `File` as a new tab, activate it, and resolve with the created tab. */
  async function importTab(file: File): Promise<NoteTab> {
    const content = await file.text();
    const title = file.name.replace(/\.md$/i, '') || 'Imported Note';
    const tab: NoteTab = {
      id: nanoid(),
      title,
      content,
      createdAt: Date.now(),
    };
    tabs.value = [...tabs.value, tab];
    activeTabId.value = tab.id;
    return tab;
  }

  return {
    tabs,
    activeTabId,
    openTabs,
    closedTabs,
    addTab,
    closeTab,
    restoreTab,
    removeTab,
    updateTabContent,
    updateTabTitle,
    setActiveTab,
    exportTab,
    importTab,
  };
}
