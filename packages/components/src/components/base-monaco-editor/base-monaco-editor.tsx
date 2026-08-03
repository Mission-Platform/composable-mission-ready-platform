import { h, useEffect, useRef, type MpElement, type MpProperties } from '@mission-platform/forge';
import { font } from '@mission-platform/tokens';

import sizeStyles from '../size.module.scss';

import styles from './base-monaco-editor.module.scss';

// Type-only import: erased at build time, so `monaco-editor` is NOT pulled into
// the synchronous module graph. The runtime module is loaded lazily via a
// dynamic `import('monaco-editor')` inside the mount `useEffect`, which lets
// Vite/Rollup split Monaco into its own chunk and ensures the editor only ever
// evaluates in the browser — keeping this component SSG-safe.
import type * as monaco from 'monaco-editor';

/** The dynamically-imported Monaco runtime module. */
type MonacoRuntime = typeof monaco;

/** A Monaco completion-item provider (passed through to `registerCompletionItemProvider`). */
export type MonacoEditorCompletionItemProvider = monaco.languages.CompletionItemProvider;

/** Monaco editor colour theme. */
export type MonacoEditorTheme = 'vs' | 'vs-dark' | 'hc-black' | 'hc-light';

/** Context handed to {@link MonacoEditorProperties.onReady} once the editor mounts. */
export interface MonacoReadyContext {
  /** The instantiated standalone editor. */
  editor: monaco.editor.IStandaloneCodeEditor;
  /** The resolved Monaco runtime module. */
  monaco: MonacoRuntime;
}

/** Size token — canonical 2xs → 2xl scale. */
export type MonacoEditorSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export interface MonacoEditorProperties extends MpProperties {
  /** Size token controlling the wrapper's font scale. Defaults to `'md'`. */
  size?: MonacoEditorSize;
  /**
   * Editor contents (controlled via `modelValue`).
   * @model onUpdateModelValue
   */
  modelValue?: string;
  /** Editor language id. Defaults to `'plaintext'`. */
  language?: string;
  /** Colour theme. Defaults to `'vs'`. */
  theme?: MonacoEditorTheme;
  /** Make the editor read-only. */
  readonly?: boolean;
  /** Show the minimap. Defaults to `false`. */
  minimap?: boolean;
  /** Show line numbers. Defaults to `true`. */
  lineNumbers?: boolean;
  /** Soft-wrap long lines. Defaults to `false`. */
  wordWrap?: boolean;
  /** CSS height of the editor host. Defaults to `'300px'`. */
  height?: string;
  /** Font size in px. Defaults to `14`. */
  fontSize?: number;
  /** Tab size in spaces. Defaults to `2`. */
  tabSize?: number;
  /** Allow scrolling past the last line. Defaults to `false`. */
  scrollBeyondLastLine?: boolean;
  /** Re-layout automatically on container resize. Defaults to `true`. */
  automaticLayout?: boolean;
  /** Optional completion-item provider registered for the current language. */
  completionProvider?: MonacoEditorCompletionItemProvider;
  /**
   * Whether spell (Hunspell) + grammar (Harper) checking should be active. When
   * `true` (and not `readonly`), the editor lazily `import()`s the
   * framework-agnostic attach cores from `@mission-platform/hunspell` /
   * `@mission-platform/harper` and wires them onto the live editor — heavy,
   * browser-only WASM kept out of the synchronous module graph. Requires the
   * app to configure `window.HunspellEnvironment` / `window.HarperEnvironment`.
   */
  spellCheck?: boolean;
  /** Fired with the next contents (the controlled `v-model` update). */
  onUpdateModelValue?: (value: string) => void;
  /** Fired with the next contents whenever they change. */
  onChange?: (value: string) => void;
  /** Fired when the editor text loses focus. */
  onBlur?: () => void;
  /** Fired when the editor text gains focus. */
  onFocus?: () => void;
  /** Fired once the editor has mounted; attach harper/hunspell or other glue here. */
  onReady?: (context: MonacoReadyContext) => void;
}

/**
 * `BaseMonacoEditor` — the Monaco code editor authored once in the neutral JSX
 * dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * Monaco is mounted **imperatively**: a `useRef` host `<div>` plus a mount
 * `useEffect` that `await import('monaco-editor')` (kept out of the synchronous
 * module graph for SSG-safety) and instantiates the editor. Per-prop
 * `useEffect`s mirror option/value changes onto the live editor. The SSR markup
 * is just the empty host; the editor only ever evaluates in the browser.
 *
 * Substitutions from the original Vue SFC: `shallowRef`/`ref` become
 * {@link useRef}; the `onMounted` create + `onBeforeUnmount` dispose become a
 * single mount {@link useEffect} with a cleanup; each `watch` becomes a
 * per-prop {@link useEffect}; and the `update:modelValue`/`change`/`blur`/
 * `focus`/`ready` emits become callback props.
 *
 * Spell/grammar checking reaches **parity** with the SFC: when `spellCheck` is
 * on (and not `readonly`), the editor lazily `import()`s the framework-agnostic
 * `attachHunspellMonaco`/`attachHarperMonaco` cores from
 * `@mission-platform/hunspell`/`@mission-platform/harper` (the same cores the
 * Vue `useHunspellMonaco`/`useHarperMonaco` composables delegate to) and wires
 * them onto the live editor — kept out of the synchronous module graph (heavy
 * browser-only WASM), exactly like the Monaco runtime itself.
 */
export function BaseMonacoEditor(properties: Readonly<MonacoEditorProperties>): MpElement {
  const {
    modelValue = '',
    language = 'plaintext',
    theme = 'vs',
    readonly = false,
    minimap = false,
    lineNumbers = true,
    wordWrap = false,
    height = '300px',
    fontSize = 14,
    tabSize = 2,
    scrollBeyondLastLine = false,
    automaticLayout = true,
    completionProvider,
    spellCheck = false,
    size = 'md',
  } = properties;

  const containerReference = useRef<HTMLDivElement | null>(null);
  const editorReference = useRef<monaco.editor.IStandaloneCodeEditor | undefined>(undefined);
  const monacoReference = useRef<MonacoRuntime | undefined>(undefined);
  // `true` while the value-mirror effect below is imperatively pushing an
  // incoming `modelValue` into the editor. Monaco fires `onDidChangeModelContent`
  // *synchronously* from `setValue`, so without this guard that programmatic edit
  // would re-emit `onUpdateModelValue`, feeding the new value straight back into
  // the controlled `modelValue` and re-triggering this (pre-flush) effect — an
  // unbounded pre-flush loop that silently freezes the host (no framework
  // recursion warning, since pre-flush jobs are not recursion-capped).
  const applyingModelValueReference = useRef<boolean>(false);
  const completionDisposableReference = useRef<monaco.IDisposable | undefined>(undefined);
  // Disposers for the lazily-attached spell/grammar checkers.
  const hunspellDisposeReference = useRef<(() => void) | undefined>(undefined);
  const harperDisposeReference = useRef<(() => void) | undefined>(undefined);

  // (Re-)wire Hunspell + Harper against the live editor. Both cores are imported
  // lazily (browser-only WASM) so they stay out of the synchronous module graph.
  const applySpellCheck = (): void => {
    hunspellDisposeReference.current?.();
    hunspellDisposeReference.current = undefined;
    harperDisposeReference.current?.();
    harperDisposeReference.current = undefined;

    const editor = editorReference.current;
    const runtime = monacoReference.current;
    if (!editor || !runtime || !spellCheck || readonly) {
      return;
    }
    const activeLanguage = language;
    void import('@mission-platform/hunspell').then(({ attachHunspellMonaco }) => {
      if (editorReference.current === editor && spellCheck && !readonly) {
        hunspellDisposeReference.current = attachHunspellMonaco(editor, runtime, activeLanguage).dispose;
      }
    });
    void import('@mission-platform/harper').then(({ attachHarperMonaco }) => {
      if (editorReference.current === editor && spellCheck && !readonly) {
        harperDisposeReference.current = attachHarperMonaco(editor, runtime, activeLanguage).dispose;
      }
    });
  };

  const registerCompletionProvider = (languageId: string): void => {
    completionDisposableReference.current?.dispose();
    completionDisposableReference.current = undefined;
    const runtime = monacoReference.current;
    if (runtime && completionProvider) {
      completionDisposableReference.current = runtime.languages.registerCompletionItemProvider(
        languageId,
        completionProvider,
      );
    }
  };

  // Mount Monaco imperatively (client-only via the dynamic import).
  useEffect(() => {
    let disposed = false;

    const mount = async (): Promise<void> => {
      if (!containerReference.current) {
        return;
      }
      const runtime = await import('monaco-editor');
      monacoReference.current = runtime;
      if (disposed || !containerReference.current) {
        return;
      }

      const editor = runtime.editor.create(containerReference.current, {
        value: modelValue,
        language,
        theme,
        readOnly: readonly,
        minimap: { enabled: minimap },
        lineNumbers: lineNumbers ? 'on' : 'off',
        wordWrap: wordWrap ? 'on' : 'off',
        fontSize,
        tabSize,
        scrollBeyondLastLine,
        automaticLayout,
        fixedOverflowWidgets: true,
        overviewRulerLanes: 0,
        overviewRulerBorder: false,
        renderLineHighlight: 'all',
        cursorStyle: 'line',
        padding: { top: 8, bottom: 8 },
        fontLigatures: true,
        fontVariations: true,
        fontFamily: font.font.family.mono,
        codeLensFontFamily: font.font.family.sans,
        copyWithSyntaxHighlighting: false,
      });
      editorReference.current = editor;

      editor.onDidChangeModelContent(() => {
        // Ignore the synchronous change event fired by our own `setValue` in the
        // value-mirror effect; only genuine user edits should emit outward.
        if (applyingModelValueReference.current) {
          return;
        }
        const value = editor.getValue();
        properties.onUpdateModelValue?.(value);
        properties.onChange?.(value);
      });
      editor.onDidBlurEditorText(() => properties.onBlur?.());
      editor.onDidFocusEditorText(() => properties.onFocus?.());

      registerCompletionProvider(language);
      properties.onReady?.({ editor, monaco: runtime });
      applySpellCheck();
    };

    void mount();

    return () => {
      disposed = true;
      completionDisposableReference.current?.dispose();
      completionDisposableReference.current = undefined;
      hunspellDisposeReference.current?.();
      hunspellDisposeReference.current = undefined;
      harperDisposeReference.current?.();
      harperDisposeReference.current = undefined;
      editorReference.current?.dispose();
      editorReference.current = undefined;
    };
  }, []);

  // Re-attach spell/grammar checking when toggled, made read-only, or the
  // language changes (matching the Vue composables' reactive wiring).
  useEffect(() => {
    applySpellCheck();
  }, [spellCheck, readonly, language]);

  // Mirror controlled value changes (skip echoes of the editor's own edits).
  useEffect(() => {
    const editor = editorReference.current;
    if (editor && editor.getValue() !== modelValue) {
      // Suppress the change event this `setValue` fires synchronously so it is
      // never re-emitted back into `modelValue` (which would loop forever).
      applyingModelValueReference.current = true;
      try {
        editor.setValue(modelValue);
      } finally {
        applyingModelValueReference.current = false;
      }
    }
  }, [modelValue]);

  useEffect(() => {
    const editor = editorReference.current;
    const runtime = monacoReference.current;
    const model = editor?.getModel();
    if (model && runtime) {
      runtime.editor.setModelLanguage(model, language);
    }
    registerCompletionProvider(language);
  }, [language]);

  useEffect(() => {
    registerCompletionProvider(language);
  }, [completionProvider]);

  useEffect(() => {
    monacoReference.current?.editor.setTheme(theme);
  }, [theme]);

  useEffect(() => {
    editorReference.current?.updateOptions({ readOnly: readonly });
  }, [readonly]);

  useEffect(() => {
    editorReference.current?.updateOptions({ minimap: { enabled: minimap } });
  }, [minimap]);

  useEffect(() => {
    editorReference.current?.updateOptions({ lineNumbers: lineNumbers ? 'on' : 'off' });
  }, [lineNumbers]);

  useEffect(() => {
    editorReference.current?.updateOptions({ wordWrap: wordWrap ? 'on' : 'off' });
  }, [wordWrap]);

  useEffect(() => {
    editorReference.current?.updateOptions({ fontSize });
  }, [fontSize]);

  useEffect(() => {
    editorReference.current?.updateOptions({ tabSize });
  }, [tabSize]);

  return (
    <div
      ref={containerReference}
      aria-label="Code editor"
      className={[styles['base-monaco-editor'], sizeStyles[`base-size--${size}`]]}
      data-language={language}
      role="group"
      style={{ height }}
    />
  );
}
