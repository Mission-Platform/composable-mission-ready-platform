<script lang="ts" setup>
  import { BaseMonacoEditor } from '@mission-platform/components';
  import * as monaco from 'monaco-editor';
  import { computed } from 'vue';

  import { useMonacoTheme } from '../composables/use-monaco-theme';
  import { useSnippets } from '../composables/use-snippets';

  interface Props {
    modelValue: string;
    tabId: string;
  }

  interface Emits {
    (event: 'update:modelValue', value: string): void;
  }

  defineProps<Props>();
  const emit = defineEmits<Emits>();

  const { snippets, resolveSlashCommand } = useSnippets();
  const { monacoTheme } = useMonacoTheme();

  const completionProvider = computed<monaco.languages.CompletionItemProvider>(() => ({
    provideCompletionItems(model, position) {
      const lineContent = model.getLineContent(position.lineNumber);
      const textBeforeCursor = lineContent.slice(0, position.column - 1);
      const slashIndex = textBeforeCursor.lastIndexOf('/');

      if (slashIndex === -1) return { suggestions: [] };

      const prefix = textBeforeCursor.slice(slashIndex + 1);
      const range = new monaco.Range(position.lineNumber, slashIndex + 1, position.lineNumber, position.column);

      const builtIn: monaco.languages.CompletionItem[] = [
        {
          label: '/date',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: resolveSlashCommand('date') ?? '',
          documentation: "Insert today's date",
          range: new monaco.Range(position.lineNumber, slashIndex + 1, position.lineNumber, position.column),
          filterText: '/date',
        },
      ];

      const userSnippets: monaco.languages.CompletionItem[] = snippets.value.map((s) => ({
        label: `/${s.name}`,
        kind: monaco.languages.CompletionItemKind.Snippet,
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

  function onEditorReady(editor: monaco.editor.IStandaloneCodeEditor): void {
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
      const range = new monaco.Range(start.lineNumber, start.column, currentPos.lineNumber, currentPos.column);

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
          slashCommandStart = new monaco.Position(position.lineNumber, position.column - 1);
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
  <BaseMonacoEditor
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
