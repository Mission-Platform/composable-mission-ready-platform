<script lang="ts" setup>
  import {
    ForgeButton,
    ForgeDrawer,
    ForgeIconButton,
    ForgeMenubar,
    ForgeNavbar,
    ForgeNavbarItem,
    ForgeStack,
    ForgeVirtualTable,
    ForgeVirtualTabs,
  } from '@mission-platform/components';
  import { ForgeDialog } from '@mission-platform/float';
  import { type FormValues, ForgeSchemaForm, type SchemaFormDefinition } from '@mission-platform/forms';
  import { useI18n } from '@mission-platform/i18n';
  import { ForgeIconDownload, ForgeIconPencil } from '@mission-platform/icons';
  import { ForgeVerticalLayout } from '@mission-platform/layouts';
  import { ForgeLanguageSwitcher, type ForgeLanguageSwitcherOption } from '@mission-platform/select';
  import { organizationId, useSeo, webPage } from '@mission-platform/seo';
  import { ForgeThemeToggle } from '@mission-platform/theme';
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

  const { t, locale, setLocale } = useI18n();
  const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;
  const MAX_IMPORTED_SNIPPETS = 100;
  const SNIPPET_SEPARATOR = '\n\n---snippet---\n\n';
  const IMPORT_ERROR_ROLE = 'alert';
  const IMPORT_ERROR_LIVE = 'assertive';
  const importError = ref<string | undefined>();

  function setImportError(message: string): void {
    importError.value = message;
  }

  function importErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      return 'Import could not be saved because browser storage is full. Free up space and try again.';
    }
    return error instanceof Error ? error.message : fallback;
  }

  function validateImportFile(file: File, maxItems = 1): boolean {
    if (file.size > MAX_IMPORT_FILE_BYTES) {
      setImportError('This import is too large. Choose a file smaller than 5 MB.');
      return false;
    }
    if (maxItems > 1 && file.size === 0) {
      setImportError('This import does not contain any snippets.');
      return false;
    }
    return true;
  }

  const locales: ForgeLanguageSwitcherOption[] = [
    { code: 'ar', countryCode: 'SA' },
    { code: 'de', countryCode: 'DE' },
    { code: 'en', countryCode: 'AU' },
    { code: 'es', countryCode: 'ES' },
    { code: 'fr', countryCode: 'FR' },
    { code: 'he', countryCode: 'IL' },
    { code: 'it', countryCode: 'IT' },
    { code: 'ja', countryCode: 'JP' },
    { code: 'ko', countryCode: 'KR' },
    { code: 'nl', countryCode: 'NL' },
    { code: 'zh', countryCode: 'CN' },
  ];

  const route = useRoute();
  const router = useRouter();

  async function switchLanguage(nextLocale: string): Promise<void> {
    await setLocale(nextLocale);
    await router.push(nextLocale === 'en' ? '/' : `/${nextLocale}/`);
  }

  // ── Rename-tab modal state ────────────────────────────────────────────────
  const renamingTabId = ref<string | undefined>(undefined);
  const renameTabValues = ref<FormValues>({ title: '' });

  const renameTabSchema = computed<SchemaFormDefinition>(() => ({
    type: 'object',
    properties: {
      title: {
        type: 'string',
        title: t(($) => $.rename.label, { ns: 'mp.my-care-notes', defaultValue: 'Tab name' }),
        minLength: 1,
      },
    },
    required: ['title'],
  }));

  function openRenameTabModal(id: string): void {
    const tab = visibleTabs.value.find((t) => t.id === id);
    if (!tab) return;
    renamingTabId.value = id;
    renameTabValues.value = { title: tab.title };
  }

  function confirmRenameTab(values: FormValues, isValid: boolean): void {
    const title = typeof values['title'] === 'string' ? values['title'].trim() : '';
    if (!isValid || !renamingTabId.value || !title) {
      return;
    }
    updateTabTitle(renamingTabId.value, title);
    renamingTabId.value = undefined;
  }

  function cancelRenameTab(): void {
    console.log('[my-care-notes] rename dialog close requested', { tabId: renamingTabId.value });
    renamingTabId.value = undefined;
  }

  function onRenameTabKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
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

  function pickFile(accept: string, onFile: (file: File) => void | Promise<void>): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => {
      if (input.files?.[0]) void onFile(input.files[0]);
    };
    input.click();
  }

  function onImportNote(): void {
    pickFile('.md,text/markdown,text/plain', async (file) => {
      importError.value = undefined;
      if (!validateImportFile(file)) return;
      try {
        await importTab(file);
      } catch (error) {
        setImportError(importErrorMessage(error, 'The note could not be imported.'));
      }
    });
  }

  function onExportNote(): void {
    if (activeTab.value) {
      exportTab(activeTab.value.id);
    }
  }

  function onImportSnippet(): void {
    pickFile('.md,text/markdown', async (file) => {
      importError.value = undefined;
      if (!validateImportFile(file)) return;
      try {
        const imported = await importSnippet(file);
        if (!imported) setImportError('The file does not contain a valid snippet.');
      } catch (error) {
        setImportError(importErrorMessage(error, 'The snippet could not be imported.'));
      }
    });
  }

  function onImportAllSnippets(): void {
    pickFile('.md,text/markdown', async (file) => {
      importError.value = undefined;
      if (!validateImportFile(file, MAX_IMPORTED_SNIPPETS)) return;
      try {
        const text = await file.text();
        const itemCount = text.split(SNIPPET_SEPARATOR).length;
        if (itemCount > MAX_IMPORTED_SNIPPETS) {
          setImportError(
            `This import contains too many snippets. Choose a file with ${MAX_IMPORTED_SNIPPETS} or fewer.`,
          );
          return;
        }
        const imported = await importAllSnippets(file);
        if (imported === 0) setImportError('The file does not contain any valid snippets.');
      } catch (error) {
        setImportError(importErrorMessage(error, 'The snippets could not be imported.'));
      }
    });
  }

  function onExportAllSnippets(): void {
    exportAllSnippets();
  }

  type SnippetRow =
    { id: undefined; name: string; content: string; [key: string]: unknown } | (Snippet & { [key: string]: unknown });

  const snippetColumns = computed(() => [
    // { key: 'id', sortable: true, label: 'ID', hidden: true },
    { key: 'name', sortable: true, label: t(($) => $.col.name, { ns: 'mp.my-care-notes', defaultValue: 'Name' }) },
    {
      key: 'content',
      sortable: true,
      label: t(($) => $.col.content, { ns: 'mp.my-care-notes', defaultValue: 'Content' }),
    },
    {
      key: 'actions',
      sortable: false,
      label: t(($) => $.col.actions, { ns: 'mp.my-care-notes', defaultValue: 'Actions' }),
    },
  ]);

  const snippetRows = computed<SnippetRow[]>(() => {
    return [
      {
        id: undefined,
        name: '/date',
        content: t(($) => $.date_row_content, { ns: 'mp.my-care-notes', defaultValue: 'Current date (DD/MM/YYYY)' }),
      },
      ...snippets.value,
    ];
  });
</script>

<template>
  <ForgeVerticalLayout>
    <ForgeNavbar brand="My Care Notes">
      <template #default>
        <ForgeNavbarItem
          :dropdown-items="[
            {
              label: t(($) => $.nav['import-note'], { ns: 'mp.my-care-notes', defaultValue: 'Import Note' }),
              onClick: onImportNote,
            },
            {
              label: t(($) => $.nav['export-note'], { ns: 'mp.my-care-notes', defaultValue: 'Export Note' }),
              onClick: onExportNote,
              disabled: !activeTab,
            },
            ...(closedTabs.length > 0
              ? [
                  { label: '\u2500'.repeat(8), disabled: true },
                  {
                    label: t(($) => $.nav['reopen-closed'], {
                      ns: 'mp.my-care-notes',
                      defaultValue: 'Reopen Closed Tab',
                    }),
                    onClick: () => {
                      if (closedTabs[0]) restoreTab(closedTabs[0].id);
                    },
                  },
                  ...closedTabs.slice(0, 10).map((tab) => ({
                    label: t(($) => $.nav['restore-tab'], {
                      ns: 'mp.my-care-notes',
                      defaultValue: 'Restore: {title}',
                      title: tab.title,
                    }),
                    onClick: () => restoreTab(tab.id),
                  })),
                ]
              : []),
          ]"
        >
          {{ t(($) => $.nav.notes, { ns: 'mp.my-care-notes', defaultValue: 'Notes' }) }}
        </ForgeNavbarItem>
        <ForgeNavbarItem @click="onToggleSnippetsPanelVisible">
          {{ t(($) => $.nav.snippets, { ns: 'mp.my-care-notes', defaultValue: 'Snippets' }) }}
        </ForgeNavbarItem>
      </template>
      <template #end>
        <ForgeLanguageSwitcher
          :locale="locale"
          :locales="locales"
          @locale-change="switchLanguage"
        />
        <ForgeThemeToggle
          :aria-label="t(($) => $.theme_toggle, { ns: 'mp.my-care-notes', defaultValue: 'Toggle colour theme' })"
        />
      </template>
    </ForgeNavbar>

    <!-- Snippets panel -->
    <ForgeDrawer
      :open="snippetsPanelVisible"
      placement="start"
      size="xl"
      :title="t(($) => $.sidebar.title, { ns: 'mp.my-care-notes', defaultValue: 'Snippets' })"
      @open-change="onSnippetsPanelUpdate"
    >
      <div
        v-if="importError"
        :role="IMPORT_ERROR_ROLE"
        :aria-live="IMPORT_ERROR_LIVE"
      >
        {{ importError }}
      </div>
      <ForgeMenubar
        :items="[
          {
            label: t(($) => $.menu.import, { ns: 'mp.my-care-notes', defaultValue: 'Import' }),
            onClick: onImportSnippet,
          },
          {
            label: t(($) => $.menu['import-all'], { ns: 'mp.my-care-notes', defaultValue: 'Import all' }),
            onClick: onImportAllSnippets,
          },
          {
            label: t(($) => $.menu['export-all'], { ns: 'mp.my-care-notes', defaultValue: 'Export all' }),
            onClick: onExportAllSnippets,
            disabled: snippets.length === 0,
          },
          {
            label: t(($) => $.menu.new, { ns: 'mp.my-care-notes', defaultValue: 'New' }),
            onClick: openNewSnippet,
          },
        ]"
      />

      <ForgeVirtualTable
        :columns="snippetColumns"
        :rows="snippetRows"
      >
        <template #cell="{ column, row: rawRow, value }">
          <template v-if="column.key === 'actions'">
            <template v-if="(rawRow as SnippetRow).id !== undefined">
              <ForgeIconButton
                :label="t(($) => $.snippet.export, { ns: 'mp.my-care-notes', defaultValue: 'Export snippet' })"
                :title="t(($) => $.snippet.export, { ns: 'mp.my-care-notes', defaultValue: 'Export snippet' })"
                size="sm"
                variant="ghost"
                @click="exportSnippet((rawRow as SnippetRow).id as string)"
              >
                <ForgeIconDownload size="xs" />
              </ForgeIconButton>
              <ForgeIconButton
                :label="t(($) => $.snippet.edit, { ns: 'mp.my-care-notes', defaultValue: 'Edit Snippet' })"
                :title="t(($) => $.snippet.edit, { ns: 'mp.my-care-notes', defaultValue: 'Edit Snippet' })"
                size="sm"
                variant="ghost"
                @click="openEditSnippet(rawRow as SnippetRow as Snippet)"
              >
                <ForgeIconPencil size="xs" />
              </ForgeIconButton>
            </template>
          </template>
          <template v-else>{{ value }}</template>
        </template>
      </ForgeVirtualTable>
    </ForgeDrawer>

    <ForgeVirtualTabs
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
    </ForgeVirtualTabs>
  </ForgeVerticalLayout>

  <ClientOnly>
    <SnippetEditorModal
      @close="closeSnippetModal"
      @delete="onSnippetDelete"
      @save="onSnippetSave"
    />
  </ClientOnly>

  <!-- Rename-tab dialog -->
  <ForgeDialog
    :open="renamingTabId !== undefined"
    :title="t(($) => $.rename.title, { ns: 'mp.my-care-notes', defaultValue: 'Rename tab' })"
    @close="cancelRenameTab"
    @update:open="(opened: boolean) => !opened && cancelRenameTab()"
  >
    <ForgeSchemaForm
      :model-value="renameTabValues"
      :schema="renameTabSchema"
      @submit="confirmRenameTab"
      @update:model-value="renameTabValues = $event"
      @keydown="onRenameTabKeydown"
    >
      <template #actions>
        <ForgeStack
          class="rename-modal-footer"
          direction="horizontal"
          gap="xs"
          justify="end"
        >
          <ForgeButton
            type="button"
            variant="tertiary"
            @click="cancelRenameTab"
          >
            {{ t(($) => $.rename.cancel, { ns: 'mp.my-care-notes', defaultValue: 'Cancel' }) }}
          </ForgeButton>
          <ForgeButton
            type="submit"
            variant="primary"
          >
            {{ t(($) => $.rename.confirm, { ns: 'mp.my-care-notes', defaultValue: 'Rename' }) }}
          </ForgeButton>
        </ForgeStack>
      </template>
    </ForgeSchemaForm>
  </ForgeDialog>
</template>

<style lang="scss" scoped>
  .rename-modal-footer {
    width: 100%;
  }
</style>
