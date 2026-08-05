import { h, type MpElement, type MpProperties, useEffect, useMemo, useRef, useState } from '@mission-platform/forge';
import { ForgeIconCheck, ForgeIconCopy } from '@mission-platform/icons';
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

import sizeStyles from '../../../styles/size.module.scss';
import { ForgeTypography } from '../forge-typography';

// The hljs token theme ships as a **plain (global) CSS side-effect import** —
// not a CSS Module — so highlight.js' generated `.hljs-*` class names are NOT
// hashed (a CSS Module would localise them). The two-stage compiler carries
// bare side-effect CSS imports onto both the React and Vue builds.
import './forge-code-block.hljs.css';
import styles from './forge-code-block.module.scss';

/** Size token — canonical 2xs → 2xl scale. */
export type CodeBlockSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

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

export interface CodeBlockProperties extends MpProperties {
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

  const highlighted = useMemo<string>(() => {
    return hljs.getLanguage(language) ? hljs.highlight(code, { language }).value : hljs.highlightAuto(code).value;
  }, [code, language]);

  const lineCount = useMemo<number>(() => highlighted.split('\n').length, [highlighted]);

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
        sizeStyles[`forge-size--${size}`],
      ]}
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
