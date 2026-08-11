/**
 * Framework-neutral rich-text command layer for the WYSIWYG editor.
 *
 * The editor's editing surface is a native `contenteditable` region, so the
 * actual formatting is delegated to the browser's built-in editing commands
 * (`document.execCommand`). This module keeps that mapping **pure and testable**:
 * it describes every supported command as data, exposes a pure translation to
 * the underlying `execCommand` name + argument, and wraps the imperative calls
 * in small guarded helpers that degrade gracefully in non-browser / unsupported
 * environments (so SSR and unit tests never throw).
 */

/** Every rich-text command the editor toolbar can invoke. */
export type WysiwygCommand =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'bulletList'
  | 'numberedList'
  | 'blockquote'
  | 'monospace'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'heading4'
  | 'heading5'
  | 'heading6'
  | 'paragraph'
  | 'alignLeft'
  | 'alignCenter'
  | 'alignRight'
  | 'alignJustify'
  | 'link'
  | 'unlink'
  | 'image'
  | 'undo'
  | 'redo'
  | 'clearFormatting';

/** The argument a command expects from the caller (a prompt value), if any. */
export type WysiwygCommandArgument = 'none' | 'url' | 'image';

/** A pure description of a rich-text command. */
export interface WysiwygCommandDescriptor {
  /** The `document.execCommand` name this command maps to. */
  readonly execCommand: string;
  /** A fixed `execCommand` argument (e.g. the block tag for `formatBlock`), if any. */
  readonly fixedValue?: string;
  /** The argument the command must be supplied with by the caller. */
  readonly argument: WysiwygCommandArgument;
}

/** The canonical, framework-neutral command table. */
export const WYSIWYG_COMMANDS: Readonly<Record<WysiwygCommand, WysiwygCommandDescriptor>> = {
  bold: { execCommand: 'bold', argument: 'none' },
  italic: { execCommand: 'italic', argument: 'none' },
  underline: { execCommand: 'underline', argument: 'none' },
  strikethrough: { execCommand: 'strikeThrough', argument: 'none' },
  bulletList: { execCommand: 'insertUnorderedList', argument: 'none' },
  numberedList: { execCommand: 'insertOrderedList', argument: 'none' },
  blockquote: { execCommand: 'formatBlock', fixedValue: 'blockquote', argument: 'none' },
  monospace: { execCommand: 'formatBlock', fixedValue: 'pre', argument: 'none' },
  heading1: { execCommand: 'formatBlock', fixedValue: 'h1', argument: 'none' },
  heading2: { execCommand: 'formatBlock', fixedValue: 'h2', argument: 'none' },
  heading3: { execCommand: 'formatBlock', fixedValue: 'h3', argument: 'none' },
  heading4: { execCommand: 'formatBlock', fixedValue: 'h4', argument: 'none' },
  heading5: { execCommand: 'formatBlock', fixedValue: 'h5', argument: 'none' },
  heading6: { execCommand: 'formatBlock', fixedValue: 'h6', argument: 'none' },
  paragraph: { execCommand: 'formatBlock', fixedValue: 'p', argument: 'none' },
  alignLeft: { execCommand: 'justifyLeft', argument: 'none' },
  alignCenter: { execCommand: 'justifyCenter', argument: 'none' },
  alignRight: { execCommand: 'justifyRight', argument: 'none' },
  alignJustify: { execCommand: 'justifyFull', argument: 'none' },
  link: { execCommand: 'createLink', argument: 'url' },
  unlink: { execCommand: 'unlink', argument: 'none' },
  image: { execCommand: 'insertImage', argument: 'image' },
  undo: { execCommand: 'undo', argument: 'none' },
  redo: { execCommand: 'redo', argument: 'none' },
  clearFormatting: { execCommand: 'removeFormat', argument: 'none' },
} as const;

/** The resolved `execCommand` invocation for a command (pure). */
export interface ResolvedExecCommand {
  /** The `document.execCommand` name. */
  readonly command: string;
  /** The resolved argument value (a `formatBlock` tag needs `<>` wrapping), if any. */
  readonly value?: string;
}

/**
 * Translate a high-level {@link WysiwygCommand} (plus an optional caller-supplied
 * value for `url`/`image` commands) into the concrete `execCommand` name and
 * argument — a **pure** function with no DOM access.
 */
export function resolveExecCommand(command: WysiwygCommand, value?: string): ResolvedExecCommand {
  const descriptor = WYSIWYG_COMMANDS[command];
  if (descriptor.fixedValue !== undefined) {
    // `formatBlock` expects the tag wrapped in angle brackets for the widest
    // cross-browser support (e.g. `<blockquote>`).
    return { command: descriptor.execCommand, value: `<${descriptor.fixedValue}>` };
  }
  if (descriptor.argument !== 'none') {
    return { command: descriptor.execCommand, value };
  }
  return { command: descriptor.execCommand };
}

/** Whether a command needs a value prompted from the user before it can run. */
export function commandRequiresArgument(command: WysiwygCommand): boolean {
  return WYSIWYG_COMMANDS[command].argument !== 'none';
}

/**
 * Run a rich-text command against a document's current selection, guarded so it
 * never throws when `execCommand` is unavailable (SSR, jsdom, locked-down
 * browsers). Returns whether the command was executed.
 */
export function runCommand(documentReference: Document | undefined, command: WysiwygCommand, value?: string): boolean {
  if (documentReference === undefined || typeof documentReference.execCommand !== 'function') {
    return false;
  }
  const resolved = resolveExecCommand(command, value);
  if (resolved.value === undefined && commandRequiresArgument(command)) {
    // A url/image command with no value supplied is a no-op rather than an error.
    return false;
  }
  try {
    return documentReference.execCommand(resolved.command, false, resolved.value);
  } catch {
    return false;
  }
}

/**
 * Whether a toggle command (`bold`, `italic`, …) is currently active for the
 * selection, guarded so it never throws when `queryCommandState` is unavailable.
 */
export function isCommandActive(documentReference: Document | undefined, command: WysiwygCommand): boolean {
  if (documentReference === undefined || typeof documentReference.queryCommandState !== 'function') {
    return false;
  }
  try {
    return documentReference.queryCommandState(WYSIWYG_COMMANDS[command].execCommand);
  } catch {
    return false;
  }
}

/**
 * The ordered set of **block-level format** commands offered by the block-style
 * dropdown (paragraph, the six headings, block quote and the editable monospace
 * block). Each one is a `formatBlock` command, so it converts the block that
 * currently contains the selection.
 */
export const BLOCK_FORMAT_COMMANDS: readonly WysiwygCommand[] = [
  'paragraph',
  'heading1',
  'heading2',
  'heading3',
  'heading4',
  'heading5',
  'heading6',
  'blockquote',
  'monospace',
] as const;

/** Map every block-format tag (as returned by `queryCommandValue`) to its command. */
const BLOCK_TAG_TO_COMMAND: Readonly<Record<string, WysiwygCommand>> = {
  p: 'paragraph',
  div: 'paragraph',
  h1: 'heading1',
  h2: 'heading2',
  h3: 'heading3',
  h4: 'heading4',
  h5: 'heading5',
  h6: 'heading6',
  blockquote: 'blockquote',
  pre: 'monospace',
};

/**
 * Resolve the {@link WysiwygCommand} describing the block format of the current
 * selection (e.g. `'heading1'` when the caret sits inside an `<h1>`), defaulting
 * to `'paragraph'`. Guarded so it never throws when `queryCommandValue` is
 * unavailable (SSR, jsdom, locked-down browsers).
 */
export function queryBlockFormat(documentReference: Document | undefined): WysiwygCommand {
  if (documentReference === undefined || typeof documentReference.queryCommandValue !== 'function') {
    return 'paragraph';
  }
  try {
    const tag = String(documentReference.queryCommandValue('formatBlock')).toLowerCase();
    return BLOCK_TAG_TO_COMMAND[tag] ?? 'paragraph';
  } catch {
    return 'paragraph';
  }
}
