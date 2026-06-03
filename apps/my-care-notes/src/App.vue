<script setup lang="ts">
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
  } from '@mission-platform/components'
  import { IconDownload, IconPencil } from '@mission-platform/icons'
  import { computed } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import MonacoEditor from './components/MonacoEditor.vue'
  import SnippetEditorModal from './components/SnippetEditorModal.vue'
  import { useSnippets } from './composables/use-snippets'
  import { useTabs } from './composables/use-tabs'
  import type { Snippet } from './types'

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
  } = useTabs()

  const {
    snippets,
    addSnippet,
    updateSnippet,
    removeSnippet,
    exportSnippet,
    exportAllSnippets,
    importSnippet,
    importAllSnippets,
  } = useSnippets()

  const route = useRoute()
  const router = useRouter()

  const visibleTabs = computed(() => openTabs().map((tab) => ({ ...tab, label: tab.title })))
  const activeTab = computed(() => visibleTabs.value.find((tab) => tab.id === activeTabId.value))

  function onRenameTab(id: string): void {
    const tab = visibleTabs.value.find((t) => t.id === id)
    if (!tab) return
    const newTitle = prompt('Rename tab:', tab.title)
    if (newTitle !== null && newTitle.trim()) {
      // eslint-disable-line unicorn/no-null -- prompt() returns null when cancelled
      updateTabTitle(id, newTitle.trim())
    }
  }

  // ── Overlay state is driven entirely by URL query params ──────────────────
  // ?panel=snippets              → snippets sidebar open
  // ?overlay=snippet-new         → new-snippet modal open
  // ?overlay=snippet-edit&id=…   → edit-snippet modal open for the given id

  const snippetsPanelVisible = computed(() => route.query['panel'] === 'snippets')

  const editingSnippet = computed<Snippet | undefined>(() => {
    if (route.query['overlay'] !== 'snippet-edit') return undefined
    const id = route.query['id']
    if (typeof id !== 'string') return undefined
    return snippets.value.find((s) => s.id === id)
  })

  function openNewSnippet(): void {
    void router.push({ query: { ...route.query, overlay: 'snippet-new', id: undefined } })
  }

  function openEditSnippet(snippet: Snippet): void {
    void router.push({ query: { ...route.query, overlay: 'snippet-edit', id: snippet.id } })
  }

  function closeSnippetModal(): void {
    const { overlay: _overlay, id: _id, ...rest } = route.query
    void router.push({ query: rest })
  }

  function onToggleSnippetsPanelVisible(): void {
    if (snippetsPanelVisible.value) {
      const { panel: _panel, ...rest } = route.query
      void router.push({ query: rest })
    } else {
      void router.push({ query: { ...route.query, panel: 'snippets' } })
    }
  }

  function onSnippetsPanelUpdate(open: boolean): void {
    if (!open && snippetsPanelVisible.value) {
      const { panel: _panel, ...rest } = route.query
      void router.push({ query: rest })
    } else if (open && !snippetsPanelVisible.value) {
      void router.push({ query: { ...route.query, panel: 'snippets' } })
    }
  }

  function onSnippetSave(name: string, content: string): void {
    if (editingSnippet.value) {
      updateSnippet(editingSnippet.value.id, name, content)
    } else {
      addSnippet(name, content)
    }
    closeSnippetModal()
  }

  function onSnippetDelete(id: string): void {
    removeSnippet(id)
    closeSnippetModal()
  }

  function pickFile(accept: string, onFile: (file: File) => void): void {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = () => {
      if (input.files?.[0]) onFile(input.files[0])
    }
    input.click()
  }

  function onImportNote(): void {
    pickFile('.md,text/markdown,text/plain', (file) => {
      importTab(file)
    })
  }

  function onExportNote(): void {
    if (activeTab.value) {
      exportTab(activeTab.value.id)
    }
  }

  function onImportSnippet(): void {
    pickFile('.md,text/markdown', (file) => {
      importSnippet(file)
    })
  }

  function onImportAllSnippets(): void {
    pickFile('.md,text/markdown', (file) => {
      importAllSnippets(file)
    })
  }

  function onExportAllSnippets(): void {
    exportAllSnippets()
  }

  type SnippetRow =
    | { id: undefined; name: string; content: string; [key: string]: unknown }
    | (Snippet & { [key: string]: unknown })

  const SNIPPET_COLUMNS = [
    // { key: 'id', sortable: true, label: 'ID', hidden: true },
    { key: 'name', sortable: true, label: 'Name' },
    { key: 'content', sortable: true, label: 'Content' },
    { key: 'actions', sortable: false, label: 'Actions' },
  ]

  const snippetRows = computed<SnippetRow[]>(() => {
    return [
      { id: undefined, name: '/date', content: 'Current date (DD/MM/YYYY)' },
      ...snippets.value,
    ]
  })
</script>

<template>
  <BaseApplicationLayout>
    <template #navbar>
      <BaseNavbar brand="My Care Notes">
        <template #default>
          <BaseNavbarItem
            :children="[
              { label: 'Import Note', onClick: onImportNote },
              { label: 'Export Note', onClick: onExportNote, disabled: !activeTab },
            ]"
          >
            Notes
          </BaseNavbarItem>
          <BaseNavbarItem @click="onToggleSnippetsPanelVisible">Snippets</BaseNavbarItem>
        </template>
        <template #end>
          <BaseThemeToggle aria-label="Toggle colour theme" />
        </template>
      </BaseNavbar>
    </template>

    <template #content>
      <!-- Snippets panel -->
      <BaseSidebar :open="snippetsPanelVisible" side="left" title="Snippets" size="xl" @update:open="onSnippetsPanelUpdate">
        <BaseMenubar
          :items="[
            { label: 'Import', onClick: onImportSnippet },
            { label: 'Import all', onClick: onImportAllSnippets },
            {
              label: 'Export all',
              onClick: onExportAllSnippets,
              disabled: snippets.length === 0,
            },
            { label: 'New', onClick: openNewSnippet },
          ]"
        />

        <BaseVirtualTable :columns="SNIPPET_COLUMNS" :rows="snippetRows">
          <template #cell-actions="{ row: rawRow }">
            <template v-if="(rawRow as SnippetRow).id !== undefined">
              <BaseButton
                variant="ghost"
                size="sm"
                title="Export snippet"
                @click="exportSnippet((rawRow as SnippetRow).id as string)"
              >
                <IconDownload size="xs" />
              </BaseButton>
              <BaseButton
                variant="ghost"
                size="sm"
                title="Edit Snippet"
                @click="openEditSnippet(rawRow as SnippetRow as Snippet)"
              >
                <IconPencil size="xs" />
              </BaseButton>
            </template>
          </template>
        </BaseVirtualTable>
      </BaseSidebar>

      <BaseVirtualTabs
        :tabs="visibleTabs"
        :active-id="activeTabId"
        variant="pill"
        closable
        addable
        @close="closeTab"
        @add="addTab"
        @rename="onRenameTab"
        @select="setActiveTab"
      >
        <template v-for="tab in visibleTabs" :key="tab.id" #[tab.id]>
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
    @save="onSnippetSave"
    @delete="onSnippetDelete"
  />
</template>
