<script lang="ts" setup>
  /**
   * `BaseMonacoEditor` — Monaco editor component for the Mission Platform UI.
   *
   * See the props, emits, and slots tables below (auto-generated from
   * the component's TypeScript declarations) for the full public API,
   * and refer to the linked stories for usage examples.
   */
  import { useHarperMonaco } from '@mission-platform/harper';
  import { useHunspellMonaco } from '@mission-platform/hunspell';
  import { fontFamilies } from '@mission-platform/tokens';
  import * as monaco from 'monaco-editor';
  import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';

  export type MonacoEditorCompletionItemProvider = monaco.languages.CompletionItemProvider;

  export type MonacoEditorLanguage =
    | 'abap'
    | 'apex'
    | 'azcli'
    | 'bat'
    | 'bicep'
    | 'cameligo'
    | 'clojure'
    | 'coffee'
    | 'cpp'
    | 'csharp'
    | 'csp'
    | 'css'
    | 'cypher'
    | 'dart'
    | 'dockerfile'
    | 'ecl'
    | 'elixir'
    | 'flow9'
    | 'freemarker2'
    | 'fsharp'
    | 'go'
    | 'graphql'
    | 'handlebars'
    | 'hcl'
    | 'html'
    | 'ini'
    | 'java'
    | 'javascript'
    | 'json'
    | 'julia'
    | 'kotlin'
    | 'less'
    | 'lexon'
    | 'liquid'
    | 'lua'
    | 'm3'
    | 'markdown'
    | 'mdx'
    | 'mips'
    | 'msdax'
    | 'mysql'
    | 'objective-c'
    | 'pascal'
    | 'pascaligo'
    | 'perl'
    | 'pgsql'
    | 'php'
    | 'pla'
    | 'postiats'
    | 'powerquery'
    | 'powershell'
    | 'proto'
    | 'pug'
    | 'python'
    | 'qsharp'
    | 'r'
    | 'razor'
    | 'redis'
    | 'redshift'
    | 'restructuredtext'
    | 'ruby'
    | 'rust'
    | 'sb'
    | 'scala'
    | 'scheme'
    | 'scss'
    | 'shell'
    | 'solidity'
    | 'sophia'
    | 'sparql'
    | 'sql'
    | 'st'
    | 'swift'
    | 'systemverilog'
    | 'tcl'
    | 'twig'
    | 'typescript'
    | 'typespec'
    | 'vb'
    | 'wgsl'
    | 'xml'
    | 'yaml'
    | 'zenscript'
    | 'plaintext';

  export type MonacoEditorTheme = 'vs' | 'vs-dark' | 'hc-black' | 'hc-light';

  const props = withDefaults(
    defineProps<{
      modelValue?: string;
      language?: MonacoEditorLanguage;
      theme?: MonacoEditorTheme;
      readonly?: boolean;
      minimap?: boolean;
      lineNumbers?: boolean;
      wordWrap?: boolean;
      height?: string;
      fontSize?: number;
      tabSize?: number;
      scrollBeyondLastLine?: boolean;
      automaticLayout?: boolean;
      completionProvider?: MonacoEditorCompletionItemProvider;
      spellCheck?: boolean;
    }>(),
    {
      modelValue: '',
      language: 'plaintext',
      theme: 'vs',
      readonly: false,
      minimap: false,
      lineNumbers: true,
      wordWrap: false,
      height: '300px',
      fontSize: 14,
      tabSize: 2,
      scrollBeyondLastLine: false,
      automaticLayout: true,
      completionProvider: undefined,
      spellCheck: false,
    },
  );

  const emit = defineEmits<{
    'update:modelValue': [value: string];
    change: [value: string];
    blur: [];
    focus: [];
    ready: [editor: monaco.editor.IStandaloneCodeEditor];
  }>();

  const containerEl = ref<HTMLDivElement | null>(null);
  const editorRef = shallowRef<monaco.editor.IStandaloneCodeEditor | undefined>(undefined);
  let completionDisposable: monaco.IDisposable | null = null;

  useHunspellMonaco(
    editorRef,
    computed(() => props.spellCheck && !props.readonly),
    computed(() => props.language ?? 'plaintext'),
  );

  useHarperMonaco(
    editorRef,
    computed(() => props.spellCheck && !props.readonly),
    computed(() => props.language ?? 'plaintext'),
  );

  function registerCompletionProvider(language: string): void {
    completionDisposable?.dispose();
    completionDisposable = null;
    if (props.completionProvider) {
      completionDisposable = monaco.languages.registerCompletionItemProvider(language, props.completionProvider);
    }
  }

  onMounted(() => {
    if (!containerEl.value) return;

    editorRef.value = monaco.editor.create(containerEl.value, {
      value: props.modelValue,
      language: props.language,
      theme: props.theme,
      readOnly: props.readonly,
      minimap: { enabled: props.minimap },
      lineNumbers: props.lineNumbers ? 'on' : 'off',
      wordWrap: props.wordWrap ? 'on' : 'off',
      fontSize: props.fontSize,
      tabSize: props.tabSize,
      scrollBeyondLastLine: props.scrollBeyondLastLine,
      automaticLayout: props.automaticLayout,
      // Render floating widgets (suggest, hover, context-menu) relative to the
      // viewport so they are never clipped by the container's overflow:hidden.
      fixedOverflowWidgets: true,
      allowOverflow: true,
      // Trim visual noise
      overviewRulerLanes: 0,
      overviewRulerBorder: false,
      renderLineHighlight: 'all',
      cursorStyle: 'line',
      padding: { top: 8, bottom: 8 },
      fontLigatures: true,
      fontVariations: true,
      fontFamily: fontFamilies.mono,
      codeLensFontFamily: fontFamilies.sans,
      copyWithSyntaxHighlighting: false,
    });

    // Forward content changes
    editorRef.value.onDidChangeModelContent(() => {
      const value = editorRef.value!.getValue();
      emit('update:modelValue', value);
      emit('change', value);
    });

    editorRef.value.onDidBlurEditorText(() => emit('blur'));
    editorRef.value.onDidFocusEditorText(() => emit('focus'));

    registerCompletionProvider(props.language ?? 'plaintext');

    emit('ready', editorRef.value);
  });

  onBeforeUnmount(() => {
    completionDisposable?.dispose();
    completionDisposable = null;
    editorRef.value?.dispose();
    editorRef.value = undefined;
  });

  // ── Watchers ───────────────────────────────────────────────────────────────

  watch(
    () => props.modelValue,
    (value) => {
      if (!editorRef.value) return;
      // Avoid re-setting value when the editor itself triggered the change
      if (editorRef.value.getValue() !== value) {
        editorRef.value.setValue(value);
      }
    },
  );

  watch(
    () => props.language,
    (language) => {
      const model = editorRef.value?.getModel();
      if (model) monaco.editor.setModelLanguage(model, language);
      registerCompletionProvider(language);
    },
  );

  watch(
    () => props.completionProvider,
    () => {
      registerCompletionProvider(props.language ?? 'plaintext');
    },
  );

  watch(
    () => props.theme,
    (theme) => {
      monaco.editor.setTheme(theme);
    },
  );

  watch(
    () => props.readonly,
    (readonly) => {
      editorRef.value?.updateOptions({ readOnly: readonly });
    },
  );

  watch(
    () => props.minimap,
    (minimap) => {
      editorRef.value?.updateOptions({ minimap: { enabled: minimap } });
    },
  );

  watch(
    () => props.lineNumbers,
    (lineNumbers) => {
      editorRef.value?.updateOptions({ lineNumbers: lineNumbers ? 'on' : 'off' });
    },
  );

  watch(
    () => props.wordWrap,
    (wordWrap) => {
      editorRef.value?.updateOptions({ wordWrap: wordWrap ? 'on' : 'off' });
    },
  );

  watch(
    () => props.fontSize,
    (fontSize) => {
      editorRef.value?.updateOptions({ fontSize });
    },
  );

  watch(
    () => props.tabSize,
    (tabSize) => {
      editorRef.value?.updateOptions({ tabSize });
    },
  );

  /**
   * Expose the raw Monaco editor instance for advanced use cases.
   */
  defineExpose({ editor: () => editorRef.value });
</script>

<template>
  <div
    ref="containerEl"
    :aria-label="`${language} editor`"
    :style="{ height }"
    class="base-monaco-editor"
  />
</template>

<style lang="scss" scoped>
  .base-monaco-editor {
    width: 100%;
    border: 1px solid var(--mp-color-border-default);
    border-radius: var(--mp-radius-md);
    overflow: hidden;
  }
</style>
