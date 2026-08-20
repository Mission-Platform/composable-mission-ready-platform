import { ForgeButton } from '@mission-platform/components';
import { ForgeDialog } from '@mission-platform/float';
import { h, type MpElement, Teleport, useEffect, useRef, useState } from '@mission-platform/forge';

import { type ContentDocument } from '../../../ast';
import { toHtml } from '../../../builders';
import { parseHtml } from '../../../parsers';
import {
  applyBlockAlign,
  type CodeBlockEmbed,
  createCodeBlockHtml,
  moveBlock,
  readBlockAlign,
  scanCodeBlocks,
  serializeSurface,
  topLevelBlockFor,
  type WysiwygBlockAlign,
} from '../../../utils/blocks';
import {
  commandRequiresArgument,
  isCommandActive,
  queryBlockFormat,
  runCommand,
  type WysiwygCommand,
} from '../../../utils/commands';
import { createEditorChangeStream, type EditorChangeStream } from '../../../utils/editor-stream';
import { resolveLabels, type WysiwygLabels } from '../../../utils/labels';
import { sanitizeHtml } from '../../../utils/sanitize';
import { type EditorStats, EMPTY_EDITOR_STATS } from '../../../utils/text-stats';
import { type CodeBlockLanguage, ForgeCodeBlock } from '../../atoms/forge-code-block';
import {
  ForgeWysiwygBlockControls,
  type WysiwygBlockControlsGeometry,
} from '../../molecules/forge-wysiwyg-block-controls';
import { ForgeWysiwygStatusBar, type WysiwygStatusItem } from '../../molecules/forge-wysiwyg-status-bar';
import { ForgeWysiwygToolbar, type WysiwygToolbarItem } from '../../molecules/forge-wysiwyg-toolbar';
import { ForgeMonacoEditor } from '../forge-monaco-editor';

import styles from './forge-wysiwyg-editor.module.scss';

/** The toggle commands whose active state is mirrored onto the toolbar. */
const TOGGLE_COMMANDS: readonly WysiwygCommand[] = ['bold', 'italic', 'underline', 'strikethrough'];

/** The syntax languages offered in the code-block dialog (mirrors {@link CodeBlockLanguage}). */
const CODE_BLOCK_LANGUAGES: readonly CodeBlockLanguage[] = [
  'plaintext',
  'bash',
  'css',
  'dockerfile',
  'go',
  'ini',
  'javascript',
  'json',
  'markdown',
  'python',
  'rust',
  'scss',
  'shell',
  'sql',
  'typescript',
  'xml',
  'yaml',
];

function normalizeCodeBlockLanguage(language: string): CodeBlockLanguage {
  return CODE_BLOCK_LANGUAGES.includes(language as CodeBlockLanguage) ? (language as CodeBlockLanguage) : 'plaintext';
}

/** Insert an HTML fragment at the current selection, guarded for SSR/jsdom. */
function insertHtmlAtSelection(documentReference: Document | undefined, html: string): boolean {
  if (documentReference === undefined || typeof documentReference.execCommand !== 'function') {
    return false;
  }
  try {
    return documentReference.execCommand('insertHTML', false, html);
  } catch {
    return false;
  }
}

export interface WysiwygEditorProperties {
  /**
   * The editor contents as a canonical content document (controlled).
   * @model onUpdateModelValue
   */
  modelValue?: ContentDocument;
  /** Placeholder shown while the editor is empty. */
  placeholder?: string;
  /** Render the editing surface read-only (hides the toolbar and per-block controls). */
  readonly?: boolean;
  /** Disable the toolbar and editing surface. */
  disabled?: boolean;
  /** Minimum height of the editing surface (any CSS length). Defaults to `'12rem'`. */
  minHeight?: string;
  /**
   * Enable spell + grammar checking. On the visual surface this sets the native
   * `spellcheck` attribute; in the HTML source view it enables the Monaco-backed
   * Hunspell (spelling) + Harper (grammar) checkers from
   * `@mission-platform/hunspell` / `@mission-platform/harper`.
   */
  spellCheck?: boolean;
  /** Show the live word/character status bar. Defaults to `true`. */
  showStatusBar?: boolean;
  /** Offer a toggle to the Monaco-backed HTML source view. Defaults to `true`. */
  allowSourceView?: boolean;
  /** Enable the per-block hover/caret controls overlay. Defaults to `true`. */
  showBlockControls?: boolean;
  /** Overridable labels (English defaults). */
  labels?: Partial<WysiwygLabels>;
  /**
   * A user-configurable set of toolbar controls. When provided, it replaces the
   * built-in formatting buttons with the supplied `{ label, state, disabled,
   * action }` items (each `action` being the button's click handler).
   */
  toolbarItems?: WysiwygToolbarItem[];
  /**
   * A user-configurable set of status-bar segments. When provided, it replaces
   * the built-in word/character counters.
   */
  statusItems?: WysiwygStatusItem[];
  /** Debounce (ms) before the live statistics recompute. Defaults to `200`. */
  statsDebounceMs?: number;
  /** Fired with the next content document (the controlled `v-model` update). */
  onUpdateModelValue?: (value: ContentDocument) => void;
  /** Fired with the next content document whenever the content changes. */
  onChange?: (value: ContentDocument) => void;
  /** Fired with the derived statistics whenever they change. */
  onStats?: (stats: EditorStats) => void;
  /** Fired when the editing surface gains focus. */
  onFocus?: () => void;
  /** Fired when the editing surface loses focus. */
  onBlur?: () => void;
}

/**
 * `ForgeWysiwygEditor` — a framework-agnostic WYSIWYG rich-text editor authored
 * once in the neutral JSX dialect and compiled to both Vue 3 and React by
 * `@mission-platform/vite-plugin-forge`.
 *
 * The visual surface is a native `contenteditable` region driven imperatively
 * through a {@link useRef} host and mount/sync {@link useEffect}s (mirroring the
 * pattern used by `ForgeMonacoEditor`). Formatting is applied through the
 * framework-neutral command layer ({@link runCommand}); block-level formats
 * (Paragraph, Headings 1-6, Block Quote, Monospace) are chosen from the toolbar
 * **dropdown** ({@link ForgeWysiwygToolbar}), and the live word/character counter
 * is its own customisable {@link ForgeWysiwygStatusBar}.
 *
 * Two richer behaviours are layered on top of the plain `contenteditable`:
 *
 * - **Non-editable code blocks** — the toolbar's code-block control inserts an
 *   empty `contenteditable="false"` placeholder carrying the code in data
 *   attributes; the editor then portals a real `ForgeCodeBlock` into each
 *   placeholder with the neutral `<Teleport>`. {@link serializeSurface} strips the
 *   portalled markup when reading the model value so persisted HTML stays clean.
 * - **Per-block controls** — hovering a block (or moving the caret into one)
 *   outlines it and shows a floating {@link ForgeWysiwygBlockControls} bar to move
 *   the block up/down and change its alignment/justification.
 *
 * An optional HTML **source view** swaps the surface for a `ForgeMonacoEditor`
 * with `spellCheck` — bringing Hunspell + Harper proofreading to the raw markup.
 */
export function ForgeWysiwygEditor(properties: Readonly<WysiwygEditorProperties>): MpElement {
  const {
    modelValue = { version: 1 as const, type: 'document' as const, children: [] },
    placeholder = '',
    readonly = false,
    disabled = false,
    minHeight = '12rem',
    spellCheck = false,
    showStatusBar = true,
    allowSourceView = true,
    showBlockControls = true,
    statsDebounceMs = 200,
  } = properties;

  const labels = resolveLabels(properties.labels);

  const surfaceReference = useRef<HTMLDivElement | null>(null);
  const bodyReference = useRef<HTMLDivElement | null>(null);
  const streamReference = useRef<EditorChangeStream | undefined>(undefined);
  const activeBlockReference = useRef<HTMLElement | undefined>(undefined);
  const keyCounterReference = useRef<number>(0);
  // The caret range captured when the code-block dialog opens, so the inserted
  // block lands where the user was editing (the surface loses focus while the
  // dialog is open).
  const savedRangeReference = useRef<Range | undefined>(undefined);
  const codeDialogKeyReference = useRef<number>(0);

  const [stats, setStats] = useState<EditorStats>(EMPTY_EDITOR_STATS);
  const [activeCommands, setActiveCommands] = useState<WysiwygCommand[]>([]);
  const [blockFormat, setBlockFormat] = useState<WysiwygCommand>('paragraph');
  const [sourceMode, setSourceMode] = useState<boolean>(false);
  const [codeDialogOpen, setCodeDialogOpen] = useState<boolean>(false);
  const [codeDialogKey, setCodeDialogKey] = useState<number>(0);
  // The language currently selected in the code-block dialog. Tracked here so
  // the embedded Monaco `code` field can highlight the picked language (rather
  // than staying on `plaintext`); reset to `plaintext` each time the dialog is
  // opened.
  const [codeDialogLanguage, setCodeDialogLanguage] = useState<CodeBlockLanguage>('plaintext');
  const [codeDialogCode, setCodeDialogCode] = useState<string>('');
  const [codeBlocks, setCodeBlocks] = useState<CodeBlockEmbed[]>([]);
  // eslint-disable-next-line unicorn/no-useless-undefined -- the neutral `useState` requires an explicit initial value
  const [blockGeometry, setBlockGeometry] = useState<WysiwygBlockControlsGeometry | undefined>(undefined);
  // eslint-disable-next-line unicorn/no-useless-undefined -- the neutral `useState` requires an explicit initial value
  const [blockAlign, setBlockAlign] = useState<WysiwygBlockAlign | undefined>(undefined);
  const [blockControlsVisible, setBlockControlsVisible] = useState<boolean>(false);
  const [canMoveUp, setCanMoveUp] = useState<boolean>(false);
  const [canMoveDown, setCanMoveDown] = useState<boolean>(false);

  const allocateKey = (): string => `cb-${keyCounterReference.current++}`;

  const rescanCodeBlocks = (): void => {
    const host = surfaceReference.current;
    setCodeBlocks(host ? scanCodeBlocks(host, allocateKey) : []);
  };

  const emitContent = (): void => {
    const host = surfaceReference.current;
    if (!host) {
      return;
    }
    const html = serializeSurface(host);
    const document = parseHtml(html);
    properties.onUpdateModelValue?.(document);
    properties.onChange?.(document);
    streamReference.current?.push(html);
  };

  const computeGeometry = (block: HTMLElement | undefined): WysiwygBlockControlsGeometry | undefined => {
    const body = bodyReference.current;
    if (!body || !block) {
      return undefined;
    }
    const bodyRect = body.getBoundingClientRect();
    const rect = block.getBoundingClientRect();
    return {
      top: rect.top - bodyRect.top,
      left: rect.left - bodyRect.left,
      width: rect.width,
      height: rect.height,
    };
  };

  const setActiveBlock = (block: HTMLElement | undefined): void => {
    activeBlockReference.current = block;
    if (!block || !showBlockControls || readonly || disabled) {
      setBlockControlsVisible(false);
      setBlockGeometry(undefined);
      return;
    }
    setBlockGeometry(computeGeometry(block));
    setBlockAlign(readBlockAlign(block));
    setCanMoveUp(block.previousElementSibling !== null);
    setCanMoveDown(block.nextElementSibling !== null);
    setBlockControlsVisible(true);
  };

  const updateActiveBlockFromSelection = (): void => {
    const surface = surfaceReference.current;
    const documentReference = surface?.ownerDocument;
    const selection = documentReference?.getSelection?.();
    if (!surface || !selection || selection.rangeCount === 0) {
      return;
    }
    const anchor = selection.anchorNode;
    if (anchor && surface.contains(anchor)) {
      const block = topLevelBlockFor(surface, anchor);
      if (block) {
        setActiveBlock(block);
      }
    }
  };

  const refreshActiveState = (): void => {
    const documentReference = surfaceReference.current?.ownerDocument;
    const nextActiveCommands = TOGGLE_COMMANDS.filter((command) => isCommandActive(documentReference, command));
    setActiveCommands(nextActiveCommands);
    setBlockFormat(queryBlockFormat(documentReference));
    updateActiveBlockFromSelection();
  };

  const handleInput = (): void => {
    emitContent();
    rescanCodeBlocks();
    refreshActiveState();
  };

  const handlePointerMove = (event: MouseEvent): void => {
    const surface = surfaceReference.current;
    if (!surface) {
      return;
    }
    const block = topLevelBlockFor(surface, event.target as Node);
    // Skip the (frequent) mousemove events that stay within the same block to
    // avoid needless state churn; geometry only changes on scroll/resize.
    if (block && block !== activeBlockReference.current) {
      setActiveBlock(block);
    }
  };

  // Re-anchor the floating block controls to the active block's current
  // position — shared by the surface `scroll` handler and the window `resize`
  // listener, both of which only shift the block's geometry (not which block is
  // active).
  const refreshActiveBlockGeometry = (): void => {
    const block = activeBlockReference.current;
    if (block) {
      setBlockGeometry(computeGeometry(block));
    }
  };

  const handleSurfaceMouseLeave = (): void => {
    // Clear the hover-driven block outline once the pointer leaves the surface
    // so it doesn't linger. Keep the controls anchored while the user has a live
    // selection inside the surface, so moving the pointer onto the floating
    // controls (which sit outside the surface) doesn't dismiss them first.
    const surface = surfaceReference.current;
    const selection = surface?.ownerDocument?.getSelection?.();
    const anchor = selection && selection.rangeCount > 0 ? selection.anchorNode : undefined;
    if (surface && anchor && surface.contains(anchor)) {
      return;
    }
    setActiveBlock(undefined);
  };

  const executeCommand = (command: WysiwygCommand): void => {
    if (disabled || readonly) {
      return;
    }
    const host = surfaceReference.current;
    const documentReference = host?.ownerDocument;
    host?.focus();

    let value: string | undefined;
    if (commandRequiresArgument(command)) {
      const message = command === 'image' ? labels.imagePrompt : labels.linkPrompt;
      const view = documentReference?.defaultView;
      const entered = typeof view?.prompt === 'function' ? view.prompt(message) : undefined;
      if (entered === null || entered === undefined || entered.length === 0) {
        return;
      }
      value = entered;
    }

    runCommand(documentReference, command, value);
    emitContent();
    refreshActiveState();
  };

  // Capture the current caret range (when inside the surface) so it can be
  // restored after the modal code-block dialog steals focus.
  const saveSelectionRange = (): void => {
    const surface = surfaceReference.current;
    const documentReference = surface?.ownerDocument;
    const selection = documentReference?.getSelection?.();
    if (surface && selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (surface.contains(range.commonAncestorContainer)) {
        savedRangeReference.current = range.cloneRange();
        return;
      }
    }
    savedRangeReference.current = undefined;
  };

  const restoreSelectionRange = (documentReference: Document | undefined): void => {
    const range = savedRangeReference.current;
    const selection = documentReference?.getSelection?.();
    if (range && selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  // Open the schema-form (Monaco) dialog to author a code block. The dialog is
  // remounted per-open (via `codeDialogKey`) so the form always starts fresh.
  const openCodeDialog = (): void => {
    if (disabled || readonly) {
      return;
    }
    saveSelectionRange();
    codeDialogKeyReference.current += 1;
    setCodeDialogKey(codeDialogKeyReference.current);
    setCodeDialogLanguage('plaintext');
    setCodeDialogCode('');
    setCodeDialogOpen(true);
  };

  const closeCodeDialog = (): void => {
    setCodeDialogOpen(false);
  };

  const handleCodeDialogOpenChange = (next: boolean): void => {
    setCodeDialogOpen(next);
  };

  const handleCodeDialogSubmit = (): void => {
    const code = codeDialogCode;
    if (code.length === 0) {
      closeCodeDialog();
      return;
    }
    const language = codeDialogLanguage || 'plaintext';
    const host = surfaceReference.current;
    const documentReference = host?.ownerDocument;
    host?.focus();
    restoreSelectionRange(documentReference);
    // The trailing paragraph keeps a caret target after the non-editable block.
    const html = `${createCodeBlockHtml(code, language)}<p><br></p>`;
    if (!insertHtmlAtSelection(documentReference, html)) {
      host?.insertAdjacentHTML('beforeend', html);
    }
    emitContent();
    rescanCodeBlocks();
    refreshActiveState();
    closeCodeDialog();
  };

  const handleCodeDialogLanguage = (event: Event): void => {
    setCodeDialogLanguage((event.currentTarget as HTMLSelectElement).value as CodeBlockLanguage);
  };

  const handleCodeDialogCode = (value: string): void => {
    setCodeDialogCode(value);
  };

  const moveActiveBlock = (direction: 'up' | 'down'): void => {
    const surface = surfaceReference.current;
    const block = activeBlockReference.current;
    if (!surface || !block) {
      return;
    }
    if (moveBlock(surface, block, direction)) {
      emitContent();
      rescanCodeBlocks();
      setActiveBlock(block);
    }
  };

  const alignActiveBlock = (align: WysiwygBlockAlign): void => {
    const block = activeBlockReference.current;
    if (!block) {
      return;
    }
    applyBlockAlign(block, align);
    setBlockAlign(align);
    emitContent();
  };

  const toggleSource = (): void => {
    setSourceMode(!sourceMode);
  };

  const handleSourceUpdate = (value: string): void => {
    const document = parseHtml(value);
    properties.onUpdateModelValue?.(document);
    properties.onChange?.(document);
    streamReference.current?.push(value);
  };

  // Create the RxJS change pipeline once, subscribe to the derived stats, and
  // seed it with the initial content.
  useEffect(() => {
    const stream = createEditorChangeStream({ debounceMs: statsDebounceMs });
    streamReference.current = stream;
    const subscription = stream.stats$.subscribe((next) => {
      setStats(next);
      properties.onStats?.(next);
    });
    stream.push(toHtml(modelValue));

    return () => {
      subscription.unsubscribe();
      stream.destroy();
      streamReference.current = undefined;
    };
  }, []);

  // Mirror controlled value changes onto the surface (skipping echoes of the
  // user's own edits, which would otherwise reset the caret). The comparison is
  // against the *serialized* surface so the portalled code-block markup never
  // triggers a spurious reset loop.
  useEffect(() => {
    const host = surfaceReference.current;
    const html = toHtml(modelValue);
    if (host && !sourceMode && serializeSurface(host) !== html) {
      host.innerHTML = sanitizeHtml(html);
      rescanCodeBlocks();
    }
  }, [modelValue, sourceMode]);

  // Drive `contenteditable`/`spellcheck` imperatively rather than as JSX
  // attributes: their casing differs between React (`contentEditable`) and the
  // DOM/Vue (`contenteditable`), and the neutral dialect doesn't alias them, so
  // setting them on the element avoids a per-render React DOM-property warning.
  useEffect(() => {
    const host = surfaceReference.current;
    if (host && !sourceMode) {
      host.contentEditable = !readonly && !disabled ? 'true' : 'false';
      host.spellcheck = spellCheck;
    }
  }, [readonly, disabled, spellCheck, sourceMode]);

  // Keep the floating block controls aligned with their block when the viewport
  // is resized: recompute the active block's geometry, reusing the surface
  // `scroll` handler. Registered on `window` because a resize doesn't surface as
  // a `scroll`/`mousemove` event on the editing surface itself.
  useEffect(() => {
    const view = bodyReference.current?.ownerDocument?.defaultView ?? undefined;
    view?.addEventListener('resize', refreshActiveBlockGeometry);
    return () => view?.removeEventListener('resize', refreshActiveBlockGeometry);
  }, []);

  return (
    <div className={[styles['wysiwyg'], { [styles['wysiwyg--disabled']]: disabled }]}>
      {readonly ? undefined : (
        <ForgeWysiwygToolbar
          disabled={disabled}
          items={properties.toolbarItems}
          activeCommands={activeCommands}
          blockFormat={blockFormat}
          labels={properties.labels}
          showSourceToggle={allowSourceView}
          sourceActive={sourceMode}
          onCommand={executeCommand}
          onSelectBlock={executeCommand}
          onInsertCodeBlock={openCodeDialog}
          onToggleSource={toggleSource}
        />
      )}

      <div
        ref={bodyReference}
        className={styles['wysiwyg__body']}
      >
        {sourceMode ? (
          <ForgeMonacoEditor
            modelValue={toHtml(modelValue)}
            language="html"
            height={minHeight}
            spellCheck={spellCheck}
            readonly={readonly || disabled}
            onUpdateModelValue={handleSourceUpdate}
          />
        ) : (
          <div
            ref={surfaceReference}
            className={styles['wysiwyg__surface']}
            role="textbox"
            aria-multiline="true"
            aria-label={labels.editor}
            data-placeholder={placeholder}
            style={{ minHeight }}
            onInput={handleInput}
            onKeyup={refreshActiveState}
            onMouseup={refreshActiveState}
            onMousemove={handlePointerMove}
            onMouseleave={handleSurfaceMouseLeave}
            onScroll={refreshActiveBlockGeometry}
            onFocus={() => properties.onFocus?.()}
            onBlur={() => properties.onBlur?.()}
          />
        )}

        {sourceMode
          ? undefined
          : codeBlocks.map((block) => (
              <Teleport
                key={block.key}
                to={block.host}
              >
                <ForgeCodeBlock
                  code={block.code}
                  language={normalizeCodeBlockLanguage(block.language)}
                />
              </Teleport>
            ))}

        {sourceMode || readonly ? undefined : (
          <ForgeWysiwygBlockControls
            visible={blockControlsVisible}
            geometry={blockGeometry}
            activeAlign={blockAlign}
            canMoveUp={canMoveUp}
            canMoveDown={canMoveDown}
            labels={properties.labels}
            onMoveUp={() => moveActiveBlock('up')}
            onMoveDown={() => moveActiveBlock('down')}
            onAlign={alignActiveBlock}
          />
        )}
      </div>

      {showStatusBar ? (
        <ForgeWysiwygStatusBar
          stats={stats}
          items={properties.statusItems}
          labels={properties.labels}
        />
      ) : undefined}

      {readonly || !codeDialogOpen ? undefined : (
        <ForgeDialog
          key={codeDialogKey}
          open={codeDialogOpen}
          title={labels.codeBlockDialogTitle}
          onClose={closeCodeDialog}
          onUpdateOpen={handleCodeDialogOpenChange}
        >
          <label>
            {labels.codeBlockLanguageLabel}
            <select
              value={codeDialogLanguage}
              onChange={handleCodeDialogLanguage}
            >
              {CODE_BLOCK_LANGUAGES.map((language) => (
                <option value={language}>{language}</option>
              ))}
            </select>
          </label>
          <ForgeMonacoEditor
            modelValue={codeDialogCode}
            language={codeDialogLanguage}
            height="16rem"
            onUpdateModelValue={handleCodeDialogCode}
            onChange={handleCodeDialogCode}
          />
          <ForgeButton onClick={handleCodeDialogSubmit}>{labels.codeBlockInsert}</ForgeButton>
        </ForgeDialog>
      )}
    </div>
  );
}
