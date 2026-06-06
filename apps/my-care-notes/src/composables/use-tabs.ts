import { nanoid } from 'nanoid';
import { ref, watch } from 'vue';

import type { NoteTab } from '../types';

const STORAGE_KEY = 'my-care-notes:tabs';
const ACTIVE_TAB_KEY = 'my-care-notes:active-tab';
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

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

function saveToStorage(tabs: NoteTab[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
}

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

export function useTabs() {
  function openTabs() {
    return tabs.value.filter((t) => !t.closedAt);
  }

  function addTab(): NoteTab {
    const tab = createDefaultTab();
    tabs.value = [...tabs.value, tab];
    activeTabId.value = tab.id;
    return tab;
  }

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

  function updateTabContent(id: string, content: string): void {
    tabs.value = tabs.value.map((t) => (t.id === id ? { ...t, content } : t));
  }

  function updateTabTitle(id: string, title: string): void {
    tabs.value = tabs.value.map((t) => (t.id === id ? { ...t, title } : t));
  }

  function setActiveTab(id: string): void {
    activeTabId.value = id;
  }

  function exportTab(id: string): void {
    const tab = tabs.value.find((t) => t.id === id);
    if (!tab) return;

    const blob = new Blob([tab.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${tab.title}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

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
    addTab,
    closeTab,
    updateTabContent,
    updateTabTitle,
    setActiveTab,
    exportTab,
    importTab,
  };
}
