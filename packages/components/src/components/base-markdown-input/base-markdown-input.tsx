import {
  h,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MpChild,
  type MpElement,
  type MpProperties,
} from '@mission-platform/jsx';
import { marked } from 'marked';

import { BaseTypography } from '../base-typography';
import { nextFieldId } from '../field-id';

import styles from './base-markdown-input.module.scss';

/** Field size token — canonical 2xs → 2xl scale. */
export type MarkdownInputSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
/** Which editor tab is active. */
export type MarkdownInputTab = 'write' | 'preview';

interface ToolbarItem {
  key: string;
  label: string;
  glyph: MpChild;
  prefix: string;
  suffix: string;
  defaultText: string;
}

const TOOLBAR: readonly ToolbarItem[] = [
  { key: 'bold', label: 'Bold', glyph: 'B', prefix: '**', suffix: '**', defaultText: 'bold text' },
  { key: 'italic', label: 'Italic', glyph: 'I', prefix: '_', suffix: '_', defaultText: 'italic text' },
  { key: 'heading', label: 'Heading', glyph: 'H', prefix: '## ', suffix: '', defaultText: 'Heading' },
  { key: 'code', label: 'Inline code', glyph: '</>', prefix: '`', suffix: '`', defaultText: 'code' },
  { key: 'link', label: 'Link', glyph: '🔗', prefix: '[', suffix: '](https://)', defaultText: 'link text' },
  { key: 'bulletList', label: 'Bullet list', glyph: '•', prefix: '- ', suffix: '', defaultText: 'list item' },
  { key: 'numberedList', label: 'Numbered list', glyph: '1.', prefix: '1. ', suffix: '', defaultText: 'list item' },
  { key: 'quote', label: 'Quote', glyph: '❝', prefix: '> ', suffix: '', defaultText: 'quoted text' },
];

export interface MarkdownInputProperties extends MpProperties {
  /** Markdown source (controlled via `modelValue`). */
  modelValue?: string;
  /** Visible rows of the textarea. Defaults to `6`. */
  rows?: number;
  /** Field size. Defaults to `'md'`. */
  size?: MarkdownInputSize;
  /** Placeholder text for the write area. */
  placeholder?: string;
  /** Visible label text. */
  label?: string;
  /** Visually hide the label (kept for assistive tech). */
  labelHidden?: boolean;
  /** Helper text shown below the field. */
  hint?: string;
  /** Error message shown below the field (replaces the hint). */
  error?: string;
  /** Disable the field (locks to preview). */
  disabled?: boolean;
  /** Make the field read-only (locks to preview). */
  readonly?: boolean;
  /** Mark the field as required (renders a `*` after the label). */
  required?: boolean;
  /** Explicit id; auto-generated when omitted. */
  id?: string;
  /** Fired with the next markdown source (the controlled `v-model` update). */
  onUpdateModelValue?: (value: string) => void;
  /** Fired with the native `change` event. */
  onChange?: (event: Event) => void;
  /** Fired with the native `blur` event. */
  onBlur?: (event: FocusEvent) => void;
  /** Fired with the native `focus` event. */
  onFocus?: (event: FocusEvent) => void;
}

/**
 * `BaseMarkdownInput` — a Markdown editor with a live preview authored once in
 * the neutral JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-jsx`.
 *
 * A write/preview tab bar fronts a formatting toolbar + textarea (write) and a
 * rendered preview (preview), with the HTML produced by **`marked`** (kept
 * verbatim). It owns its styling through the co-located CSS Module
 * `base-markdown-input.module.scss`.
 *
 * Substitutions from the original Vue SFC: the `v-html` preview becomes a
 * **`useRef` host + `useEffect` `innerHTML`** assignment (the `BaseWindowPopout`
 * escape-hatch), so the rendered HTML is injected on the client and the SSR
 * markup is the static shell; the `computed` render becomes {@link useMemo}; the
 * active tab `ref` becomes {@link useState}; the `@mission-platform/icons`
 * toolbar SVGs become text glyphs; the `useI18n` labels become plain strings;
 * the `useId` composable becomes `nextFieldId`; and the `v-model` + `change`/
 * `blur`/`focus` emits become the callback props.
 */
export function BaseMarkdownInput(properties: MarkdownInputProperties): MpElement {
  const {
    modelValue = '',
    rows = 6,
    size = 'md',
    placeholder = '',
    label,
    labelHidden = false,
    hint,
    error,
    disabled = false,
    readonly = false,
    required = false,
  } = properties;

  const idReference = useRef<string>(properties.id ?? nextFieldId('mp-markdown-input'));
  const resolvedId = idReference.current;
  const describedBy = error ? `${resolvedId}-error` : hint ? `${resolvedId}-hint` : undefined;

  const textareaReference = useRef<HTMLTextAreaElement | null>(null);
  const previewReference = useRef<HTMLElement | null>(null);
  const [activeTab, setActiveTab] = useState<MarkdownInputTab>('write');

  const locked = disabled || readonly;
  const effectiveTab: MarkdownInputTab = locked ? 'preview' : activeTab;

  const renderedHtml = useMemo<string>(() => (modelValue ? (marked.parse(modelValue) as string) : ''), [modelValue]);

  // Inject the rendered preview HTML on the client (the neutral dialect models
  // no `v-html`); SSR renders the empty preview shell.
  useEffect(() => {
    if (previewReference.current && effectiveTab === 'preview') {
      previewReference.current.innerHTML = renderedHtml;
    }
  }, [renderedHtml, effectiveTab]);

  const handleInput = (event: Event): void => {
    properties.onUpdateModelValue?.((event.target as HTMLTextAreaElement).value);
  };

  const applyFormat = (item: ToolbarItem): void => {
    const textarea = textareaReference.current;
    if (!textarea) {
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.slice(start, end) || item.defaultText;
    const replacement = `${item.prefix}${selected}${item.suffix}`;
    const nextValue = textarea.value.slice(0, start) + replacement + textarea.value.slice(end);
    properties.onUpdateModelValue?.(nextValue);
    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + item.prefix.length + selected.length + item.suffix.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  return (
    <div
      classNames={[styles['markdown-input'], styles[`markdown-input--${size}`], {
        [styles['markdown-input--error']]: !!error,
        [styles['markdown-input--disabled']]: disabled,
        [styles['markdown-input--readonly']]: readonly,
      }]}
    >
      {label ? (
        <label
          classNames={[styles['markdown-input__label'], {
            [styles['markdown-input__label--hidden']]: labelHidden,
          }]}
          for={resolvedId}
        >
          <BaseTypography
            as="span"
            color="primary"
            variant="label"
          >
            {label}
          </BaseTypography>
          {required ? (
            <span
              aria-hidden="true"
              classNames={styles['markdown-input__required']}
              title="required"
            >
              *
            </span>
          ) : undefined}
        </label>
      ) : undefined}

      <div classNames={styles['markdown-input__editor']}>
        {locked ? undefined : (
          <div
            classNames={styles['markdown-input__tabs']}
            role="tablist"
          >
            <button
              aria-controls={`${resolvedId}-write-panel`}
              aria-selected={effectiveTab === 'write'}
              classNames={[styles['markdown-input__tab'], {
                [styles['markdown-input__tab--active']]: effectiveTab === 'write',
              }]}
              role="tab"
              type="button"
              onClick={() => setActiveTab('write')}
            >
              Write
            </button>
            <button
              aria-controls={`${resolvedId}-preview-panel`}
              aria-selected={effectiveTab === 'preview'}
              classNames={[styles['markdown-input__tab'], {
                [styles['markdown-input__tab--active']]: effectiveTab === 'preview',
              }]}
              role="tab"
              type="button"
              onClick={() => setActiveTab('preview')}
            >
              Preview
            </button>
          </div>
        )}

        {effectiveTab === 'write' ? (
          <div
            aria-label={label ?? 'Markdown toolbar'}
            classNames={styles['markdown-input__toolbar']}
            role="toolbar"
          >
            {TOOLBAR.map((item) => (
              <button
                key={item.key}
                aria-label={item.label}
                classNames={styles['markdown-input__tool']}
                disabled={disabled}
                title={item.label}
                type="button"
                onClick={() => applyFormat(item)}
              >
                <span aria-hidden="true">{item.glyph}</span>
              </button>
            ))}
          </div>
        ) : undefined}

        {effectiveTab === 'write' ? (
          <div
            id={`${resolvedId}-write-panel`}
            classNames={styles['markdown-input__panel']}
          >
            <textarea
              id={resolvedId}
              ref={textareaReference}
              aria-describedby={describedBy}
              aria-invalid={error ? 'true' : undefined}
              classNames={styles['markdown-input__textarea']}
              disabled={disabled}
              placeholder={placeholder}
              readonly={readonly}
              required={required}
              rows={rows}
              value={modelValue}
              onBlur={(event: FocusEvent) => properties.onBlur?.(event)}
              onChange={(event: Event) => properties.onChange?.(event)}
              onFocus={(event: FocusEvent) => properties.onFocus?.(event)}
              onInput={handleInput}
            />
          </div>
        ) : (
          <div
            id={`${resolvedId}-preview-panel`}
            ref={previewReference}
            classNames={styles['markdown-input__preview']}
          />
        )}
      </div>

      {error ? (
        <p
          id={`${resolvedId}-error`}
          classNames={styles['markdown-input__error']}
          role="alert"
        >
          <BaseTypography
            as="span"
            color="inherit"
            variant="caption"
          >
            {error}
          </BaseTypography>
        </p>
      ) : hint ? (
        <p
          id={`${resolvedId}-hint`}
          classNames={styles['markdown-input__hint']}
        >
          <BaseTypography
            as="span"
            color="secondary"
            variant="caption"
          >
            {hint}
          </BaseTypography>
        </p>
      ) : undefined}
    </div>
  );
}
