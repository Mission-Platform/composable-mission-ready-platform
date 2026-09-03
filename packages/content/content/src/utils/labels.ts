/**
 * Framework-neutral, English default labels for the WYSIWYG editor.
 *
 * Following the `@mission-platform/components` convention, the editor stays
 * decoupled from any specific i18n runtime: every user-facing string is exposed
 * as an overridable label with a sensible English default, so an app can pass
 * translations sourced from `@mission-platform/i18n` (or anywhere else) without
 * the library taking a hard i18n dependency.
 */

/** Every overridable label the editor and toolbar render. */
export interface WysiwygLabels {
  /** Accessible name for the toolbar region. */
  readonly toolbar: string;
  /** Accessible name for the editing surface. */
  readonly editor: string;
  readonly bold: string;
  readonly italic: string;
  readonly underline: string;
  readonly strikethrough: string;
  /** Accessible name / trigger label for the block-format dropdown. */
  readonly blockFormat: string;
  readonly paragraph: string;
  readonly heading1: string;
  readonly heading2: string;
  readonly heading3: string;
  readonly heading4: string;
  readonly heading5: string;
  readonly heading6: string;
  readonly blockquote: string;
  /** The editable monospace (`<pre>`) block-format option. */
  readonly monospace: string;
  readonly codeBlock: string;
  readonly bulletList: string;
  readonly numberedList: string;
  readonly alignLeft: string;
  readonly alignCenter: string;
  readonly alignRight: string;
  readonly alignJustify: string;
  readonly link: string;
  readonly image: string;
  readonly undo: string;
  readonly redo: string;
  readonly toggleSource: string;
  /** Prompt shown when inserting a link. */
  readonly linkPrompt: string;
  /** Prompt shown when inserting an image. */
  readonly imagePrompt: string;
  /** Prompt shown when inserting a non-editable code block. */
  readonly codeBlockPrompt: string;
  /** Title of the code-block insertion dialog. */
  readonly codeBlockDialogTitle: string;
  /** Label for the language selector in the code-block dialog. */
  readonly codeBlockLanguageLabel: string;
  /** Label for the code editor field in the code-block dialog. */
  readonly codeBlockCodeLabel: string;
  /** Confirm/insert button in the code-block dialog. */
  readonly codeBlockInsert: string;
  /** Cancel button in the code-block dialog. */
  readonly codeBlockCancel: string;
  /** Accessible name for the per-block controls overlay. */
  readonly blockControls: string;
  /** Move the current block up one position. */
  readonly moveBlockUp: string;
  /** Move the current block down one position. */
  readonly moveBlockDown: string;
  /** Accessible name for the editor status bar region. */
  readonly statusBar: string;
  /** Suffix for the live word counter (e.g. `12 words`). */
  readonly words: string;
  /** Suffix for the live character counter (e.g. `56 characters`). */
  readonly characters: string;
}

/** The canonical English defaults. */
export const WYSIWYG_DEFAULT_LABELS: WysiwygLabels = {
  toolbar: 'Formatting',
  editor: 'Rich text editor',
  bold: 'Bold',
  italic: 'Italic',
  underline: 'Underline',
  strikethrough: 'Strikethrough',
  blockFormat: 'Block format',
  paragraph: 'Paragraph',
  heading1: 'Heading 1',
  heading2: 'Heading 2',
  heading3: 'Heading 3',
  heading4: 'Heading 4',
  heading5: 'Heading 5',
  heading6: 'Heading 6',
  blockquote: 'Quote',
  monospace: 'Monospace',
  codeBlock: 'Code block',
  bulletList: 'Bulleted list',
  numberedList: 'Numbered list',
  alignLeft: 'Align left',
  alignCenter: 'Align center',
  alignRight: 'Align right',
  alignJustify: 'Justify',
  link: 'Insert link',
  image: 'Insert image',
  undo: 'Undo',
  redo: 'Redo',
  toggleSource: 'Toggle HTML source',
  linkPrompt: 'Enter a URL',
  imagePrompt: 'Enter an image URL',
  codeBlockPrompt: 'Enter the code to insert',
  codeBlockDialogTitle: 'Insert code block',
  codeBlockLanguageLabel: 'Language',
  codeBlockCodeLabel: 'Code',
  codeBlockInsert: 'Insert',
  codeBlockCancel: 'Cancel',
  blockControls: 'Block controls',
  moveBlockUp: 'Move block up',
  moveBlockDown: 'Move block down',
  statusBar: 'Editor status',
  words: 'words',
  characters: 'characters',
};

/** Merge partial overrides over the English defaults. */
export function resolveLabels(overrides: Partial<WysiwygLabels> | undefined): WysiwygLabels {
  return overrides === undefined ? WYSIWYG_DEFAULT_LABELS : { ...WYSIWYG_DEFAULT_LABELS, ...overrides };
}

/** The block-format command → label mapping used by the block-style dropdown. */
const BLOCK_FORMAT_LABEL_KEYS: Readonly<Record<string, keyof WysiwygLabels>> = {
  paragraph: 'paragraph',
  heading1: 'heading1',
  heading2: 'heading2',
  heading3: 'heading3',
  heading4: 'heading4',
  heading5: 'heading5',
  heading6: 'heading6',
  blockquote: 'blockquote',
  monospace: 'monospace',
};

/**
 * Resolve the human label for a block-format command (e.g. `'heading1'` →
 * `'Heading 1'`), defaulting to the paragraph label for anything unrecognised.
 */
export function blockFormatLabel(command: string, labels: WysiwygLabels): string {
  return labels[BLOCK_FORMAT_LABEL_KEYS[command] ?? 'paragraph'];
}
