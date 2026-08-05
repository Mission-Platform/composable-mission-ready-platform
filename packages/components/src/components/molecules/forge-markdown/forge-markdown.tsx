import { h, type MpElement, type MpProperties, useMemo } from '@mission-platform/forge';

import sizeStyles from '../../../styles/size.module.scss';

import styles from './forge-markdown.module.scss';
import { MarkdownBlock } from './markdown-block';
import { collectHeadingIds, lexMarkdown, type MarkdownSize } from './markdown-utils';

import type { Token } from 'marked';

export type { MarkdownSize } from './markdown-utils';

export interface MarkdownProperties extends MpProperties {
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
  const { source, size = 'md', resolveHref } = properties;

  const documentTokens = useMemo<Token[]>(() => lexMarkdown(source), [source]);
  // Precompute stable, de-duplicated heading ids once so anchors stay unique
  // across the recursive render.
  const headingIds = useMemo(() => collectHeadingIds(documentTokens), [documentTokens]);

  // Drop the structural `space` / `def` tokens that carry no rendered output.
  const blocks = documentTokens.filter((token) => token.type !== 'space' && token.type !== 'def');

  return (
    <div className={[styles['forge-markdown'], sizeStyles[`forge-size--${size}`]]}>
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
