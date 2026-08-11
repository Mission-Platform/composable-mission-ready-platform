<script lang="ts" setup>
  import { ForgeMonacoEditor, type MonacoReadyContext } from '@mission-platform/content';
  import { computed } from 'vue';

  import { useMonacoTheme } from '../composables/use-monaco-theme';
  import { useSnippets } from '../composables/use-snippets';

  // Type-only import: erased at build time. The runtime Monaco module is
  // loaded lazily — see `loadMonaco()` below and `ForgeMonacoEditor` itself.
  // This keeps `monaco-editor` out of the eagerly-loaded module graph so it
  // can be code-split into its own chunk by Vite.
  import type * as monaco from 'monaco-editor';

  type MonacoRuntime = typeof monaco;

  interface Props {
    modelValue: string;
    tabId: string;
  }

  interface Emits {
    (event: 'update:modelValue', value: string): void;
  }

  defineProps<Props>();
  const emit = defineEmits<Emits>();

  // Cached, lazily-resolved Monaco runtime module — populated by the first
  // call to `loadMonaco()` (i.e. the first time the editor is interacted
  // with). The dynamic `import()` also lets Vite emit Monaco as a separate
  // chunk that is never shipped to consumers that don't render the editor.
  let monacoRuntime: MonacoRuntime | undefined;
  async function loadMonaco(): Promise<MonacoRuntime> {
    if (!monacoRuntime) {
      // Dynamically import the Monaco/Harper `?worker` wiring so the worker
      // entries stay out of the synchronous module graph (and out of the
      // `vite-ssg` server build entirely).
      const { ensureMonacoEnvironment } = await import('../monaco-environment');
      ensureMonacoEnvironment();
      monacoRuntime = await import('monaco-editor');
    }
    return monacoRuntime;
  }

  const { snippets, resolveSlashCommand } = useSnippets();
  const { monacoTheme } = useMonacoTheme();

  const completionProvider = computed<monaco.languages.CompletionItemProvider>(() => ({
    async provideCompletionItems(model, position) {
      // Lazily resolve the Monaco runtime — by the time the user triggers
      // completion the editor is already mounted, so the dynamic import is
      // cache-resolved on the microtask and effectively synchronous.
      const m = await loadMonaco();

      const lineContent = model.getLineContent(position.lineNumber);
      const textBeforeCursor = lineContent.slice(0, position.column - 1);
      const slashIndex = textBeforeCursor.lastIndexOf('/');

      if (slashIndex === -1) return { suggestions: [] };

      const prefix = textBeforeCursor.slice(slashIndex + 1);
      const range = new m.Range(position.lineNumber, slashIndex + 1, position.lineNumber, position.column);

      const builtIn: monaco.languages.CompletionItem[] = [
        {
          label: '/date',
          kind: m.languages.CompletionItemKind.Snippet,
          insertText: resolveSlashCommand('date') ?? '',
          documentation: "Insert today's date",
          range: new m.Range(position.lineNumber, slashIndex + 1, position.lineNumber, position.column),
          filterText: '/date',
        },
      ];

      const userSnippets: monaco.languages.CompletionItem[] = snippets.value.map((s) => ({
        label: `/${s.name}`,
        kind: m.languages.CompletionItemKind.Snippet,
        insertText: s.content,
        documentation: s.content,
        range,
        filterText: `/${s.name}`,
      }));

      const allSuggestions = [...builtIn, ...userSnippets].filter((s) =>
        (s.filterText as string).startsWith(`/${prefix}`),
      );

      return { suggestions: allSuggestions };
    },
  }));

  async function onEditorReady({ editor }: MonacoReadyContext): Promise<void> {
    // Resolve the lazy Monaco runtime once; safe to await here because the
    // editor is already mounted by the time this handler fires, so the
    // dynamic-import promise is already cache-resolved.
    const m = await loadMonaco();

    // Slash command tracking state — scoped per editor instance
    let slashCommandStart: monaco.Position | undefined;

    function applySlashCommand(command: string): void {
      const resolved = resolveSlashCommand(command);
      if (resolved === undefined || slashCommandStart === undefined) return;

      const model = editor.getModel();
      if (!model) return;

      const start = slashCommandStart;
      const currentPos = editor.getPosition();
      if (!currentPos) return;

      // Replace the /command text (including the slash) with the resolved value
      const range = new m.Range(start.lineNumber, start.column, currentPos.lineNumber, currentPos.column);

      editor.executeEdits('slash-command', [{ range, text: resolved }]);
      slashCommandStart = undefined;
    }

    // Track when a slash is typed to begin a slash-command sequence
    editor.onDidChangeModelContent(() => {
      const position = editor.getPosition();
      const model = editor.getModel();
      if (position && model) {
        const lineContent = model.getLineContent(position.lineNumber);
        const charBefore = lineContent[position.column - 2];
        if (charBefore === '/') {
          // Record where the slash started (column is 1-based, so slash is at column-1)
          slashCommandStart = new m.Position(position.lineNumber, position.column - 1);
        }
      }
    });

    editor.onKeyDown((e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        if (slashCommandStart !== undefined) {
          const position = editor.getPosition();
          const model = editor.getModel();
          if (!position || !model) return;

          const lineContent = model.getLineContent(slashCommandStart.lineNumber);
          const commandText = lineContent.slice(slashCommandStart.column - 1, position.column - 1);

          if (commandText.startsWith('/')) {
            const command = commandText.slice(1);
            const resolved = resolveSlashCommand(command);
            if (resolved !== undefined) {
              e.preventDefault();
              e.stopPropagation();
              applySlashCommand(command);
              return;
            }
          }
          slashCommandStart = undefined;
        }
      }

      if (e.code === 'Escape') {
        slashCommandStart = undefined;
      }
    });
  }
</script>

<template>
  <ForgeMonacoEditor
    :completion-provider="completionProvider"
    :font-size="15"
    :line-numbers="false"
    :model-value="modelValue"
    :spell-check="true"
    :theme="monacoTheme"
    :word-wrap="true"
    class="care-notes-editor"
    height="100%"
    language="markdown"
    @ready="onEditorReady"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>

<style lang="scss" scoped>
  .care-notes-editor {
    flex: 1;
    border: none;
    border-radius: 0;
  }
</style>
