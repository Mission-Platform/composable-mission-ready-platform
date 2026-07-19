<script lang="ts" setup>
  import {
    BaseButton,
    BaseDialog,
    BaseDrawer,
    BaseIconButton,
    BaseInput,
    BaseMenubar,
    BaseNavbar,
    BaseNavbarItem,
    BaseStack,
    BaseThemeToggle,
    BaseVirtualTable,
    BaseVirtualTabs,
  } from '@mission-platform/components/vue';
  import { useI18n } from '@mission-platform/i18n/vue';
  import { IconDownload, IconPencil } from '@mission-platform/icons/vue';
  import { BaseVerticalLayout } from '@mission-platform/layouts/vue';
  import { organizationId, useSeo, webPage } from '@mission-platform/seo';
  import { computed, defineAsyncComponent, ref } from 'vue';
  import { useRoute, useRouter } from 'vue-router';

  import ClientOnly from './components/client-only.vue';
  import { useSnippets } from './composables/use-snippets';
  import { useTabs } from './composables/use-tabs';
  import { APP_DESCRIPTION, APP_LOCALE_BCP47, APP_ORIGIN, APP_TITLE, PUBLISHER_URL } from './seo-app';

  import type { Snippet } from './types';

  defineOptions({ name: 'MyCareNotesApp' });

  // The Monaco-backed editor and the snippet editor modal both pull in the
  // (heavy, browser-only) `monaco-editor` runtime and its `?worker` entries.
  // Load them as async components so they are code-split into client-only
  // chunks and excluded from the `vite-ssg` server build / prerendered HTML —
  // the editor has no meaningful server-rendered output anyway and mounts on
  // the client after hydration.
  const MonacoEditor = defineAsyncComponent(() => import('./components/monaco-editor.vue'));
  const SnippetEditorModal = defineAsyncComponent(() => import('./components/snippet-editor-modal.vue'));

  // Per-route SEO surface: emit the `WebPage` JSON-LD node for this route,
  // explicitly linked into the site-wide `WebSite` + `Organization` graph
  // (emitted once per app in `main.ts`) via stable `@id` references.
  useSeo({
    jsonLd: [
      {
        ...webPage({
          name: APP_TITLE,
          url: APP_ORIGIN,
          description: APP_DESCRIPTION,
          inLanguage: APP_LOCALE_BCP47,
          isPartOf: { name: APP_TITLE, url: APP_ORIGIN },
        }),
        about: { '@id': organizationId(PUBLISHER_URL) },
      },
    ],
  });

  const {
    activeTabId,
    openTabs,
    closedTabs,
    addTab,
    closeTab,
    restoreTab,
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

  const { t } = useI18n();

  const route = useRoute();
  const router = useRouter();

  // ── Rename-tab modal state ────────────────────────────────────────────────
  const renamingTabId = ref<string | undefined>(undefined);
  const renameTabTitle = ref('');

  function openRenameTabModal(id: string): void {
    const tab = visibleTabs.value.find((t) => t.id === id);
    if (!tab) return;
    renamingTabId.value = id;
    renameTabTitle.value = tab.title;
  }

  function confirmRenameTab(): void {
    if (renamingTabId.value && renameTabTitle.value.trim()) {
      updateTabTitle(renamingTabId.value, renameTabTitle.value.trim());
    }
    renamingTabId.value = undefined;
  }

  function cancelRenameTab(): void {
    console.log('[my-care-notes] rename dialog close requested', { tabId: renamingTabId.value });
    renamingTabId.value = undefined;
  }

  function onRenameTabKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      confirmRenameTab();
    } else if (event.key === 'Escape') {
      cancelRenameTab();
    }
  }

  const visibleTabs = computed(() => openTabs().map((tab) => ({ ...tab, label: tab.title })));
  const activeTab = computed(() => visibleTabs.value.find((tab) => tab.id === activeTabId.value));

  function onRenameTab(id: string): void {
    openRenameTabModal(id);
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
    { id: undefined; name: string; content: string; [key: string]: unknown } | (Snippet & { [key: string]: unknown });

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
  <BaseVerticalLayout>
    <BaseNavbar brand="My Care Notes">
      <template #default>
        <BaseNavbarItem
          :children="[
            { label: t('nav.import-note'), onClick: onImportNote },
            { label: t('nav.export-note'), onClick: onExportNote, disabled: !activeTab },
            ...(closedTabs.length > 0
              ? [
                  { label: '\u2500'.repeat(8), disabled: true },
                  {
                    label: t('nav.reopen-closed'),
                    onClick: () => restoreTab(closedTabs[0]!.id),
                  },
                  ...closedTabs.slice(0, 10).map((tab) => ({
                    label: t('nav.restore-tab', { title: tab.title }),
                    onClick: () => restoreTab(tab.id),
                  })),
                ]
              : []),
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

    <!-- Snippets panel -->
    <BaseDrawer
      :open="snippetsPanelVisible"
      placement="start"
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
        <template #cell="{ column, row: rawRow, value }">
          <template v-if="column.key === 'actions'">
            <template v-if="(rawRow as SnippetRow).id !== undefined">
              <BaseIconButton
                :label="t('snippet.export')"
                :title="t('snippet.export')"
                size="sm"
                variant="ghost"
                @click="exportSnippet((rawRow as SnippetRow).id as string)"
              >
                <IconDownload size="xs" />
              </BaseIconButton>
              <BaseIconButton
                :label="t('snippet.edit')"
                :title="t('snippet.edit')"
                size="sm"
                variant="ghost"
                @click="openEditSnippet(rawRow as SnippetRow as Snippet)"
              >
                <IconPencil size="xs" />
              </BaseIconButton>
            </template>
          </template>
          <template v-else>{{ value }}</template>
        </template>
      </BaseVirtualTable>
    </BaseDrawer>

    <BaseVirtualTabs
      :model-value="activeTabId"
      :tabs="visibleTabs"
      addable
      closable
      variant="pill"
      @add="addTab"
      @close="closeTab"
      @rename="onRenameTab"
      @update:model-value="(id?: string) => id !== undefined && setActiveTab(id)"
    >
      <template #panel="{ tab }">
        <ClientOnly>
          <MonacoEditor
            :model-value="openTabs().find((openedTab) => openedTab.id === tab.id)?.content ?? ''"
            :tab-id="tab.id"
            @update:model-value="updateTabContent(tab.id, $event)"
          />
        </ClientOnly>
      </template>
    </BaseVirtualTabs>
  </BaseVerticalLayout>

  <ClientOnly>
    <SnippetEditorModal
      @close="closeSnippetModal"
      @delete="onSnippetDelete"
      @save="onSnippetSave"
    />
  </ClientOnly>

  <!-- Rename-tab dialog -->
  <BaseDialog
    :open="renamingTabId !== undefined"
    :title="t('rename.title')"
    @close="cancelRenameTab"
    @update:open="(opened: boolean) => !opened && cancelRenameTab()"
  >
    <BaseInput
      id="rename-tab-input"
      v-model="renameTabTitle"
      :label="t('rename.label')"
      autocomplete="off"
      @keydown="onRenameTabKeydown"
    />
    <template #footer>
      <BaseStack
        class="rename-modal-footer"
        direction="horizontal"
        gap="xs"
        justify="end"
      >
        <BaseButton
          variant="tertiary"
          @click="cancelRenameTab"
        >
          {{ t('rename.cancel') }}
        </BaseButton>
        <BaseButton
          :disabled="!renameTabTitle.trim()"
          variant="primary"
          @click="confirmRenameTab"
        >
          {{ t('rename.confirm') }}
        </BaseButton>
      </BaseStack>
    </template>
  </BaseDialog>
</template>

<style lang="scss" scoped>
  .rename-modal-footer {
    width: 100%;
  }
</style>

<i18n lang="yaml">
en:
  nav:
    notes: Notes
    snippets: Snippets
    import-note: Import Note
    export-note: Export Note
    reopen-closed: Reopen Closed Tab
    restore-tab: 'Restore: {title}'
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
  rename:
    title: Rename tab
    label: Tab name
    cancel: Cancel
    confirm: Rename
</i18n>
