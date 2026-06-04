<script lang="ts" setup>
  import {
    BaseApplicationLayout,
    BaseButton,
    BaseMenubar,
    BaseNavbar,
    BaseNavbarItem,
    BaseSidebar,
    BaseThemeToggle,
    BaseVirtualTable,
    BaseVirtualTabs,
  } from '@mission-platform/components';
  import { useI18n } from '@mission-platform/i18n';
  import { IconDownload, IconPencil } from '@mission-platform/icons';
  import { computed } from 'vue';
  import { useRoute, useRouter } from 'vue-router';

  import MonacoEditor from './components/monaco-editor.vue';
  import SnippetEditorModal from './components/snippet-editor-modal.vue';
  import { useSnippets } from './composables/use-snippets';
  import { useTabs } from './composables/use-tabs';

  import type { Snippet } from './types';

  const {
    activeTabId,
    openTabs,
    addTab,
    closeTab,
    updateTabContent,
    updateTabTitle,
    setActiveTab,
    exportTab,
    importTab,
  } = useTabs();

  const {
    snippets,
    addSnippet,
    updateSnippet,
    removeSnippet,
    exportSnippet,
    exportAllSnippets,
    importSnippet,
    importAllSnippets,
  } = useSnippets();

  const { t } = useI18n({ useScope: 'local' });

  const route = useRoute();
  const router = useRouter();

  const visibleTabs = computed(() => openTabs().map((tab) => ({ ...tab, label: tab.title })));
  const activeTab = computed(() => visibleTabs.value.find((tab) => tab.id === activeTabId.value));

  function onRenameTab(id: string): void {
    const tab = visibleTabs.value.find((t) => t.id === id);
    if (!tab) return;
    const newTitle = prompt('Rename tab:', tab.title);
    if (newTitle !== null && newTitle.trim()) {
      updateTabTitle(id, newTitle.trim());
    }
  }

  // ── Overlay state is driven entirely by URL query params ──────────────────
  // ?panel=snippets              → snippets sidebar open
  // ?overlay=snippet-new         → new-snippet modal open
  // ?overlay=snippet-edit&id=…   → edit-snippet modal open for the given id

  const snippetsPanelVisible = computed(() => route.query['panel'] === 'snippets');

  const editingSnippet = computed<Snippet | undefined>(() => {
    if (route.query['overlay'] !== 'snippet-edit') return undefined;
    const id = route.query['id'];
    if (typeof id !== 'string') return undefined;
    return snippets.value.find((s) => s.id === id);
  });

  function openNewSnippet(): void {
    router.push({ query: { ...route.query, overlay: 'snippet-new', id: undefined } });
  }

  function openEditSnippet(snippet: Snippet): void {
    router.push({ query: { ...route.query, overlay: 'snippet-edit', id: snippet.id } });
  }

  function closeSnippetModal(): void {
    const { overlay: _overlay, id: _id, ...rest } = route.query;
    router.push({ query: rest });
  }

  function onToggleSnippetsPanelVisible(): void {
    if (snippetsPanelVisible.value) {
      const { panel: _panel, ...rest } = route.query;
      router.push({ query: rest });
    } else {
      router.push({ query: { ...route.query, panel: 'snippets' } });
    }
  }

  function onSnippetsPanelUpdate(open: boolean): void {
    if (!open && snippetsPanelVisible.value) {
      const { panel: _panel, ...rest } = route.query;
      router.push({ query: rest });
    } else if (open && !snippetsPanelVisible.value) {
      router.push({ query: { ...route.query, panel: 'snippets' } });
    }
  }

  function onSnippetSave(name: string, content: string): void {
    if (editingSnippet.value) {
      updateSnippet(editingSnippet.value.id, name, content);
    } else {
      addSnippet(name, content);
    }
    closeSnippetModal();
  }

  function onSnippetDelete(id: string): void {
    removeSnippet(id);
    closeSnippetModal();
  }

  function pickFile(accept: string, onFile: (file: File) => void): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => {
      if (input.files?.[0]) onFile(input.files[0]);
    };
    input.click();
  }

  function onImportNote(): void {
    pickFile('.md,text/markdown,text/plain', (file) => {
      importTab(file);
    });
  }

  function onExportNote(): void {
    if (activeTab.value) {
      exportTab(activeTab.value.id);
    }
  }

  function onImportSnippet(): void {
    pickFile('.md,text/markdown', (file) => {
      importSnippet(file);
    });
  }

  function onImportAllSnippets(): void {
    pickFile('.md,text/markdown', (file) => {
      importAllSnippets(file);
    });
  }

  function onExportAllSnippets(): void {
    exportAllSnippets();
  }

  type SnippetRow =
    | { id: undefined; name: string; content: string; [key: string]: unknown }
    | (Snippet & { [key: string]: unknown });

  const snippetColumns = computed(() => [
    // { key: 'id', sortable: true, label: 'ID', hidden: true },
    { key: 'name', sortable: true, label: t('col.name') },
    { key: 'content', sortable: true, label: t('col.content') },
    { key: 'actions', sortable: false, label: t('col.actions') },
  ]);

  const snippetRows = computed<SnippetRow[]>(() => {
    return [{ id: undefined, name: '/date', content: t('date-row-content') }, ...snippets.value];
  });
</script>

<template>
  <BaseApplicationLayout>
    <template #navbar>
      <BaseNavbar brand="My Care Notes">
        <template #default>
          <BaseNavbarItem
            :children="[
              { label: t('nav.import-note'), onClick: onImportNote },
              { label: t('nav.export-note'), onClick: onExportNote, disabled: !activeTab },
            ]"
          >
            {{ t('nav.notes') }}
          </BaseNavbarItem>
          <BaseNavbarItem @click="onToggleSnippetsPanelVisible">
            {{ t('nav.snippets') }}
          </BaseNavbarItem>
        </template>
        <template #end>
          <BaseThemeToggle :aria-label="t('theme-toggle')" />
        </template>
      </BaseNavbar>
    </template>

    <template #content>
      <!-- Snippets panel -->
      <BaseSidebar
        :open="snippetsPanelVisible"
        side="left"
        size="xl"
        :title="t('sidebar.title')"
        @update:open="onSnippetsPanelUpdate"
      >
        <BaseMenubar
          :items="[
            { label: t('menu.import'), onClick: onImportSnippet },
            { label: t('menu.import-all'), onClick: onImportAllSnippets },
            {
              label: t('menu.export-all'),
              onClick: onExportAllSnippets,
              disabled: snippets.length === 0,
            },
            { label: t('menu.new'), onClick: openNewSnippet },
          ]"
        />

        <BaseVirtualTable
          :columns="snippetColumns"
          :rows="snippetRows"
        >
          <template #cell-actions="{ row: rawRow }">
            <template v-if="(rawRow as SnippetRow).id !== undefined">
              <BaseButton
                size="sm"
                :title="t('snippet.export')"
                variant="ghost"
                @click="exportSnippet((rawRow as SnippetRow).id as string)"
              >
                <IconDownload size="xs" />
              </BaseButton>
              <BaseButton
                size="sm"
                :title="t('snippet.edit')"
                variant="ghost"
                @click="openEditSnippet(rawRow as SnippetRow as Snippet)"
              >
                <IconPencil size="xs" />
              </BaseButton>
            </template>
          </template>
        </BaseVirtualTable>
      </BaseSidebar>

      <BaseVirtualTabs
        :active-id="activeTabId"
        :tabs="visibleTabs"
        addable
        closable
        variant="pill"
        @add="addTab"
        @close="closeTab"
        @rename="onRenameTab"
        @select="setActiveTab"
      >
        <template
          v-for="tab in visibleTabs"
          :key="tab.id"
          #[tab.id]
        >
          <MonacoEditor
            :model-value="openTabs().find((t) => t.id === tab.id)?.content ?? ''"
            :tab-id="tab.id"
            @update:model-value="updateTabContent(tab.id, $event)"
          />
        </template>
      </BaseVirtualTabs>
    </template>
  </BaseApplicationLayout>

  <SnippetEditorModal
    @close="closeSnippetModal"
    @delete="onSnippetDelete"
    @save="onSnippetSave"
  />
</template>

<i18n lang="yaml">
en:
  nav:
    notes: Notes
    snippets: Snippets
    import-note: Import Note
    export-note: Export Note
  theme-toggle: Toggle colour theme
  sidebar:
    title: Snippets
  menu:
    import: Import
    import-all: Import all
    export-all: Export all
    new: New
  col:
    name: Name
    content: Content
    actions: Actions
  snippet:
    export: Export snippet
    edit: Edit Snippet
  date-row-content: Current date (DD/MM/YYYY)
</i18n>
