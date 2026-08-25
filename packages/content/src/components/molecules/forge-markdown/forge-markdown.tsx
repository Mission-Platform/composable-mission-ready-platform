import { useMemo, createForgeStyle, type MpElement, type CSSStyleProperties } from '@mission-platform/forge';

import styles from './forge-markdown.module.scss';
import { MarkdownBlock } from './markdown-block';
import { collectHeadingIds, lexMarkdown, type MarkdownSize } from './markdown-utilities';

import type { Token } from 'marked';

export type { MarkdownSize } from './markdown-utilities';

/* ── Visual property overrides (generated) ───────────────────────────── */
export interface MarkdownStyleProperties {
  readonly 'blockquote-border'?: string;
  readonly 'blockquote-border-width'?: string;
  readonly 'blockquote-padding-block'?: string;
  readonly 'blockquote-padding-inline'?: string;
  readonly 'blockquote-text'?: string;
  readonly 'flow-block-gap'?: string;
  readonly 'flow-heading-scroll-margin'?: string;
  readonly 'flow-list-indent'?: string;
  readonly 'flow-list-item-gap'?: string;
  readonly 'flow-task-gap'?: string;
  readonly 'image-radius'?: string;
  readonly 'rule-border'?: string;
  readonly 'rule-border-width'?: string;
  readonly 'text-default'?: string;
  readonly 'text-link'?: string;
  readonly 'typography-font-family'?: string;
  readonly 'typography-line-height'?: string;
}

export type MarkdownStyle = CSSStyleProperties & {
  readonly '--forge-markdown-blockquote-border'?: string | undefined;
  readonly '--forge-markdown-blockquote-border-width'?: string | undefined;
  readonly '--forge-markdown-blockquote-padding-block'?: string | undefined;
  readonly '--forge-markdown-blockquote-padding-inline'?: string | undefined;
  readonly '--forge-markdown-blockquote-text'?: string | undefined;
  readonly '--forge-markdown-flow-block-gap'?: string | undefined;
  readonly '--forge-markdown-flow-heading-scroll-margin'?: string | undefined;
  readonly '--forge-markdown-flow-list-indent'?: string | undefined;
  readonly '--forge-markdown-flow-list-item-gap'?: string | undefined;
  readonly '--forge-markdown-flow-task-gap'?: string | undefined;
  readonly '--forge-markdown-image-radius'?: string | undefined;
  readonly '--forge-markdown-rule-border'?: string | undefined;
  readonly '--forge-markdown-rule-border-width'?: string | undefined;
  readonly '--forge-markdown-text-default'?: string | undefined;
  readonly '--forge-markdown-text-link'?: string | undefined;
  readonly '--forge-markdown-typography-font-family'?: string | undefined;
  readonly '--forge-markdown-typography-line-height'?: string | undefined;
};

function createMarkdownStyle(properties: Readonly<MarkdownStyleProperties> | undefined): MarkdownStyle | undefined {
  return createForgeStyle({
    '--forge-markdown-blockquote-border': properties?.['blockquote-border'],
    '--forge-markdown-blockquote-border-width': properties?.['blockquote-border-width'],
    '--forge-markdown-blockquote-padding-block': properties?.['blockquote-padding-block'],
    '--forge-markdown-blockquote-padding-inline': properties?.['blockquote-padding-inline'],
    '--forge-markdown-blockquote-text': properties?.['blockquote-text'],
    '--forge-markdown-flow-block-gap': properties?.['flow-block-gap'],
    '--forge-markdown-flow-heading-scroll-margin': properties?.['flow-heading-scroll-margin'],
    '--forge-markdown-flow-list-indent': properties?.['flow-list-indent'],
    '--forge-markdown-flow-list-item-gap': properties?.['flow-list-item-gap'],
    '--forge-markdown-flow-task-gap': properties?.['flow-task-gap'],
    '--forge-markdown-image-radius': properties?.['image-radius'],
    '--forge-markdown-rule-border': properties?.['rule-border'],
    '--forge-markdown-rule-border-width': properties?.['rule-border-width'],
    '--forge-markdown-text-default': properties?.['text-default'],
    '--forge-markdown-text-link': properties?.['text-link'],
    '--forge-markdown-typography-font-family': properties?.['typography-font-family'],
    '--forge-markdown-typography-line-height': properties?.['typography-line-height'],
  }) as MarkdownStyle | undefined;
}
/* ── End visual property overrides ─────────────────────────────────────── */
export interface MarkdownProperties {
  /** The Markdown source to render. */
  source: string;
  /** Size token controlling the rendered text scale. Defaults to `'md'`. */
  size?: MarkdownSize;
  /**
   * Optional resolver for hyperlink targets. When it returns a string the link
   * is rewritten to that value and marked `data-internal="true"` (so a host app
   * can intercept in-app navigation); when it returns `undefined` the original
   * `href` is kept. Absolute (`http(s)://`, `mailto:`, `tel:`) links that are
   * not rewritten open in a new tab.
   */
  resolveHref?: (href: string) => string | undefined;

  /** Component-owned CSS custom-property overrides. */
  properties?: Readonly<MarkdownStyleProperties>;
}

/**
 * `ForgeMarkdown` — a read-only Markdown renderer authored once in the neutral
 * JSX dialect and compiled straight to React or Vue by
 * `@mission-platform/vite-plugin-forge`.
 *
 * Unlike the editor `ForgeMarkdownInput` (whose live preview is injected as raw
 * `innerHTML`), this component renders the Markdown **as real components**:
 * fenced code becomes `ForgeCodeBlock`, GFM tables become `ForgeTable`, and every
 * heading / paragraph / inline run is styled through `ForgeTypography` so the
 * document matches the platform's type scale. It drives rendering from the
 * `marked` token stream via the recursive `MarkdownBlock` / `MarkdownInline`
 * child components (the same self-recursive child-component pattern as
 * `ForgeTreeView`), so there is no `v-html` and the tree is SSR-safe. It owns its
 * styling through the co-located CSS Module `forge-markdown.module.scss`.
 */
export function ForgeMarkdown(properties: Readonly<MarkdownProperties>): MpElement {
  const style = createMarkdownStyle(properties.properties);

  const { source, size = 'md', resolveHref } = properties;

  const documentTokens = useMemo<Token[]>(() => lexMarkdown(source), [source]);
  // Precompute stable, de-duplicated heading ids once so anchors stay unique
  // across the recursive render.
  const headingIds = useMemo(() => collectHeadingIds(documentTokens), [documentTokens]);

  // Drop the structural `space` / `def` tokens that carry no rendered output.
  const blocks = documentTokens.filter((token) => token.type !== 'space' && token.type !== 'def');

  return (
    <div
      className={[styles['forge-markdown'], size ? `forge-size--${size}` : undefined]}
      style={style}
    >
      {blocks.map((token, index) => (
        <MarkdownBlock
          key={index}
          headingIds={headingIds}
          resolveHref={resolveHref}
          size={size}
          token={token}
        />
      ))}
    </div>
  );
}
