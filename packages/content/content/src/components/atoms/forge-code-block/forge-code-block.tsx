import {
  useEffect,
  useMemo,
  useRef,
  useState,
  createForgeStyle,
  type MpElement,
  type CSSStyleProperties,
} from '@mission-platform/forge';
import { ForgeIconCheck, ForgeIconCopy } from '@mission-platform/icons';
import { ForgeTypography } from '@mission-platform/typography';
import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import go from 'highlight.js/lib/languages/go';
import ini from 'highlight.js/lib/languages/ini';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import plaintext from 'highlight.js/lib/languages/plaintext';
import python from 'highlight.js/lib/languages/python';
import rust from 'highlight.js/lib/languages/rust';
import scss from 'highlight.js/lib/languages/scss';
import shell from 'highlight.js/lib/languages/shell';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';

// The hljs token theme ships as a **plain (global) CSS side-effect import** —
// not a CSS Module — so highlight.js' generated `.hljs-*` class names are NOT
// hashed (a CSS Module would localise them). The two-stage compiler carries
// bare side-effect CSS imports onto both the React and Vue builds.
import './forge-code-block.hljs.css';
import styles from './forge-code-block.module.scss';

import type { SizeScale } from '@mission-platform/tokens';

/** Size token — canonical 2xs → 2xl scale. */
export type CodeBlockSize = SizeScale;

/** Colour tone of the code block — the canonical colour set (`neutral` is the plain treatment). */
export type CodeBlockVariant =
  'neutral' | 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'info' | 'error' | 'critical';

/** Languages registered with the bundled `highlight.js/lib/core`. */
export type CodeBlockLanguage =
  | 'bash'
  | 'css'
  | 'dockerfile'
  | 'go'
  | 'ini'
  | 'javascript'
  | 'json'
  | 'markdown'
  | 'plaintext'
  | 'python'
  | 'rust'
  | 'scss'
  | 'shell'
  | 'sql'
  | 'typescript'
  | 'xml'
  | 'yaml';

hljs.registerLanguage('bash', bash);
hljs.registerLanguage('css', css);
hljs.registerLanguage('dockerfile', dockerfile);
hljs.registerLanguage('go', go);
hljs.registerLanguage('ini', ini);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('plaintext', plaintext);
hljs.registerLanguage('python', python);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('scss', scss);
hljs.registerLanguage('shell', shell);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('yaml', yaml);

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface CodeBlockStyleProperties {
  readonly 'code-border-default'?: string;
  readonly 'code-border-width'?: string;
  readonly 'code-copy-border-default'?: string;
  readonly 'code-copy-border-focus-visible'?: string;
  readonly 'code-copy-border-hover'?: string;
  readonly 'code-copy-border-width-default'?: string;
  readonly 'code-copy-border-width-focus-visible'?: string;
  readonly 'code-copy-font-family'?: string;
  readonly 'code-copy-font-size'?: string;
  readonly 'code-copy-gap'?: string;
  readonly 'code-copy-padding-block'?: string;
  readonly 'code-copy-padding-inline'?: string;
  readonly 'code-copy-radius'?: string;
  readonly 'code-copy-surface-default'?: string;
  readonly 'code-copy-surface-hover'?: string;
  readonly 'code-copy-text-default'?: string;
  readonly 'code-copy-text-hover'?: string;
  readonly 'code-copy-transition-duration'?: string;
  readonly 'code-copy-transition-easing'?: string;
  readonly 'code-filename-font-family'?: string;
  readonly 'code-filename-font-size'?: string;
  readonly 'code-filename-text'?: string;
  readonly 'code-gutter-padding-block'?: string;
  readonly 'code-gutter-padding-inline-end'?: string;
  readonly 'code-gutter-padding-inline-start'?: string;
  readonly 'code-gutter-text'?: string;
  readonly 'code-header-border'?: string;
  readonly 'code-header-gap'?: string;
  readonly 'code-header-padding-block'?: string;
  readonly 'code-header-padding-inline'?: string;
  readonly 'code-header-surface'?: string;
  readonly 'code-language-font-family'?: string;
  readonly 'code-language-font-size'?: string;
  readonly 'code-language-text'?: string;
  readonly 'code-padding'?: string;
  readonly 'code-radius'?: string;
  readonly 'code-surface-default'?: string;
  readonly 'code-typography-font-family'?: string;
  readonly 'code-typography-font-size'?: string;
  readonly 'code-typography-line-height'?: string;
  readonly 'code-variant-numbered-border'?: string;
  readonly 'line-height'?: string;
}

export type CodeBlockStyle = CSSStyleProperties & {
  readonly '--forge-code-block-code-border-default'?: string | undefined;
  readonly '--forge-code-block-code-border-width'?: string | undefined;
  readonly '--forge-code-block-code-copy-border-default'?: string | undefined;
  readonly '--forge-code-block-code-copy-border-focus-visible'?: string | undefined;
  readonly '--forge-code-block-code-copy-border-hover'?: string | undefined;
  readonly '--forge-code-block-code-copy-border-width-default'?: string | undefined;
  readonly '--forge-code-block-code-copy-border-width-focus-visible'?: string | undefined;
  readonly '--forge-code-block-code-copy-font-family'?: string | undefined;
  readonly '--forge-code-block-code-copy-font-size'?: string | undefined;
  readonly '--forge-code-block-code-copy-gap'?: string | undefined;
  readonly '--forge-code-block-code-copy-padding-block'?: string | undefined;
  readonly '--forge-code-block-code-copy-padding-inline'?: string | undefined;
  readonly '--forge-code-block-code-copy-radius'?: string | undefined;
  readonly '--forge-code-block-code-copy-surface-default'?: string | undefined;
  readonly '--forge-code-block-code-copy-surface-hover'?: string | undefined;
  readonly '--forge-code-block-code-copy-text-default'?: string | undefined;
  readonly '--forge-code-block-code-copy-text-hover'?: string | undefined;
  readonly '--forge-code-block-code-copy-transition-duration'?: string | undefined;
  readonly '--forge-code-block-code-copy-transition-easing'?: string | undefined;
  readonly '--forge-code-block-code-filename-font-family'?: string | undefined;
  readonly '--forge-code-block-code-filename-font-size'?: string | undefined;
  readonly '--forge-code-block-code-filename-text'?: string | undefined;
  readonly '--forge-code-block-code-gutter-padding-block'?: string | undefined;
  readonly '--forge-code-block-code-gutter-padding-inline-end'?: string | undefined;
  readonly '--forge-code-block-code-gutter-padding-inline-start'?: string | undefined;
  readonly '--forge-code-block-code-gutter-text'?: string | undefined;
  readonly '--forge-code-block-code-header-border'?: string | undefined;
  readonly '--forge-code-block-code-header-gap'?: string | undefined;
  readonly '--forge-code-block-code-header-padding-block'?: string | undefined;
  readonly '--forge-code-block-code-header-padding-inline'?: string | undefined;
  readonly '--forge-code-block-code-header-surface'?: string | undefined;
  readonly '--forge-code-block-code-language-font-family'?: string | undefined;
  readonly '--forge-code-block-code-language-font-size'?: string | undefined;
  readonly '--forge-code-block-code-language-text'?: string | undefined;
  readonly '--forge-code-block-code-padding'?: string | undefined;
  readonly '--forge-code-block-code-radius'?: string | undefined;
  readonly '--forge-code-block-code-surface-default'?: string | undefined;
  readonly '--forge-code-block-code-typography-font-family'?: string | undefined;
  readonly '--forge-code-block-code-typography-font-size'?: string | undefined;
  readonly '--forge-code-block-code-typography-line-height'?: string | undefined;
  readonly '--forge-code-block-code-variant-numbered-border'?: string | undefined;
  readonly '--forge-code-block-line-height'?: string | undefined;
};

function createCodeBlockStyle(properties: Readonly<CodeBlockStyleProperties> | undefined): CodeBlockStyle | undefined {
  return createForgeStyle({
    '--forge-code-block-code-border-default': properties?.['code-border-default'],
    '--forge-code-block-code-border-width': properties?.['code-border-width'],
    '--forge-code-block-code-copy-border-default': properties?.['code-copy-border-default'],
    '--forge-code-block-code-copy-border-focus-visible': properties?.['code-copy-border-focus-visible'],
    '--forge-code-block-code-copy-border-hover': properties?.['code-copy-border-hover'],
    '--forge-code-block-code-copy-border-width-default': properties?.['code-copy-border-width-default'],
    '--forge-code-block-code-copy-border-width-focus-visible': properties?.['code-copy-border-width-focus-visible'],
    '--forge-code-block-code-copy-font-family': properties?.['code-copy-font-family'],
    '--forge-code-block-code-copy-font-size': properties?.['code-copy-font-size'],
    '--forge-code-block-code-copy-gap': properties?.['code-copy-gap'],
    '--forge-code-block-code-copy-padding-block': properties?.['code-copy-padding-block'],
    '--forge-code-block-code-copy-padding-inline': properties?.['code-copy-padding-inline'],
    '--forge-code-block-code-copy-radius': properties?.['code-copy-radius'],
    '--forge-code-block-code-copy-surface-default': properties?.['code-copy-surface-default'],
    '--forge-code-block-code-copy-surface-hover': properties?.['code-copy-surface-hover'],
    '--forge-code-block-code-copy-text-default': properties?.['code-copy-text-default'],
    '--forge-code-block-code-copy-text-hover': properties?.['code-copy-text-hover'],
    '--forge-code-block-code-copy-transition-duration': properties?.['code-copy-transition-duration'],
    '--forge-code-block-code-copy-transition-easing': properties?.['code-copy-transition-easing'],
    '--forge-code-block-code-filename-font-family': properties?.['code-filename-font-family'],
    '--forge-code-block-code-filename-font-size': properties?.['code-filename-font-size'],
    '--forge-code-block-code-filename-text': properties?.['code-filename-text'],
    '--forge-code-block-code-gutter-padding-block': properties?.['code-gutter-padding-block'],
    '--forge-code-block-code-gutter-padding-inline-end': properties?.['code-gutter-padding-inline-end'],
    '--forge-code-block-code-gutter-padding-inline-start': properties?.['code-gutter-padding-inline-start'],
    '--forge-code-block-code-gutter-text': properties?.['code-gutter-text'],
    '--forge-code-block-code-header-border': properties?.['code-header-border'],
    '--forge-code-block-code-header-gap': properties?.['code-header-gap'],
    '--forge-code-block-code-header-padding-block': properties?.['code-header-padding-block'],
    '--forge-code-block-code-header-padding-inline': properties?.['code-header-padding-inline'],
    '--forge-code-block-code-header-surface': properties?.['code-header-surface'],
    '--forge-code-block-code-language-font-family': properties?.['code-language-font-family'],
    '--forge-code-block-code-language-font-size': properties?.['code-language-font-size'],
    '--forge-code-block-code-language-text': properties?.['code-language-text'],
    '--forge-code-block-code-padding': properties?.['code-padding'],
    '--forge-code-block-code-radius': properties?.['code-radius'],
    '--forge-code-block-code-surface-default': properties?.['code-surface-default'],
    '--forge-code-block-code-typography-font-family': properties?.['code-typography-font-family'],
    '--forge-code-block-code-typography-font-size': properties?.['code-typography-font-size'],
    '--forge-code-block-code-typography-line-height': properties?.['code-typography-line-height'],
    '--forge-code-block-code-variant-numbered-border': properties?.['code-variant-numbered-border'],
    '--forge-code-block-line-height': properties?.['line-height'],
  }) as CodeBlockStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface CodeBlockProperties {
  /** The source code to render. */
  code: string;
  /** Syntax language. Defaults to `'plaintext'`. */
  language?: CodeBlockLanguage;
  /** Optional filename shown in the header (overrides the language label). */
  filename?: string;
  /** Render a line-number gutter. Defaults to `false`. */
  showLineNumbers?: boolean;
  /** Render the copy-to-clipboard button. Defaults to `true`. */
  showCopyButton?: boolean;
  /** Cap the scrollable body height (number = px, or any CSS length). */
  maxHeight?: string | number;
  /** Size token controlling the code font scale. Defaults to `'md'`. */
  size?: CodeBlockSize;
  /** Colour tone of the code block (tints the border/header). Defaults to `'neutral'`. */
  variant?: CodeBlockVariant;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<CodeBlockStyleProperties>;
}

/**
 * `ForgeCodeBlock` — a syntax-highlighted code viewer authored once in the
 * neutral JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * It highlights `code` with **`highlight.js`** (kept verbatim) and renders a
 * header (filename/language + copy button) above a scrollable body. It owns its
 * styling through the co-located CSS Module `forge-code-block.module.scss` and
 * the global hljs token theme `forge-code-block.hljs.css`.
 *
 * Substitutions from the original Vue SFC: the `v-html` highlighted output
 * becomes a **`useRef` host + `useEffect` `innerHTML`** assignment (the
 * `ForgeWindowPopout` escape-hatch), since the neutral dialect models no `v-html`
 * — so the highlighted markup is injected on the client and the SSR markup is
 * the static shell; the `computed` highlight becomes {@link useMemo}; the copy
 * `ref` + `setTimeout` become {@link useState} + a {@link useRef} timer; the
 * inline copy SVGs are the write-once `@mission-platform/icons`
 * `ForgeIconCopy`/`ForgeIconCheck`; and the global hljs theme `<style>`
 * `@import` becomes the bare-side-effect `forge-code-block.hljs.css` import.
 */
export function ForgeCodeBlock(properties: Readonly<CodeBlockProperties>): MpElement {
  const style = createCodeBlockStyle(properties.properties);

  const {
    code,
    language = 'plaintext',
    filename,
    showLineNumbers = false,
    showCopyButton = true,
    maxHeight,
    size = 'md',
    variant = 'neutral',
  } = properties;

  const [copied, setCopied] = useState<boolean>(false);
  const timerReference = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const codeReference = useRef<HTMLElement | null>(null);

  // The rendered source. A trailing newline is dropped so it does not render an
  // empty final row that the gutter has no number for (the clipboard still gets
  // the untouched `code`).
  const source = useMemo<string>(() => (code.endsWith('\n') ? code.slice(0, -1) : code), [code]);

  const highlighted = useMemo<string>(() => {
    return hljs.getLanguage(language) ? hljs.highlight(source, { language }).value : hljs.highlightAuto(source).value;
  }, [source, language]);

  // Count the lines from the **source**, never from the highlighted markup: hljs
  // wraps tokens in `<span>`s that may straddle newlines, so the markup is not a
  // reliable line count and a wrong count shifts every number out of step with
  // its line of code.
  const lineCount = useMemo<number>(() => source.split('\n').length, [source]);

  // Inject the highlighted markup into the code host on the client (the neutral
  // dialect models no `v-html`); SSR renders the empty shell.
  useEffect(() => {
    if (codeReference.current) {
      codeReference.current.innerHTML = highlighted;
    }
  }, [highlighted]);

  const bodyMaxHeight =
    maxHeight === undefined ? undefined : typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight;
  const bodyStyle = bodyMaxHeight ? { maxHeight: bodyMaxHeight, overflowY: 'auto' as const } : undefined;

  const copyCode = (): void => {
    void navigator.clipboard?.writeText(code);
    setCopied(true);
    if (timerReference.current !== undefined) {
      clearTimeout(timerReference.current);
    }
    timerReference.current = setTimeout(() => setCopied(false), 2000);
  };

  const hasHeader = filename !== undefined || showCopyButton;

  const gutter = showLineNumbers ? (
    <div
      aria-hidden="true"
      className={styles['forge-code-block__gutter']}
    >
      {Array.from({ length: lineCount }, (_, index) => (
        <span
          key={index}
          className={styles['forge-code-block__line-no']}
        >
          {index + 1}
        </span>
      ))}
    </div>
  ) : undefined;

  return (
    <div
      className={[
        styles['forge-code-block'],
        styles[`forge-code-block--${variant}`],
        size ? `forge-size--${size}` : undefined,
      ]}
      style={style}
    >
      {hasHeader ? (
        <div className={styles['forge-code-block__header']}>
          {filename ? (
            <span className={styles['forge-code-block__filename']}>{filename}</span>
          ) : (
            <span className={styles['forge-code-block__language']}>{language}</span>
          )}
          {showCopyButton ? (
            <button
              aria-label={copied ? 'Copied' : 'Copy code'}
              className={styles['forge-code-block__copy']}
              type="button"
              onClick={copyCode}
            >
              {copied ? <ForgeIconCheck size="xs" /> : <ForgeIconCopy size="xs" />}
              <ForgeTypography
                as="span"
                color="inherit"
                variant="caption"
              >
                {copied ? 'Copied' : 'Copy'}
              </ForgeTypography>
            </button>
          ) : undefined}
        </div>
      ) : undefined}

      <div
        className={[
          styles['forge-code-block__body'],
          {
            [styles['forge-code-block__body--numbered']]: showLineNumbers,
          },
        ]}
        style={bodyStyle}
        tabindex={0}
      >
        {gutter}
        <pre className={styles['forge-code-block__pre']}>
          <code
            ref={codeReference}
            className={[styles['forge-code-block__code'], 'hljs']}
          />
        </pre>
      </div>
    </div>
  );
}
