import { h, type MpElement, type MpProperties } from '@mission-platform/forge';

import { ForgeCodeBlock } from '../../atoms/forge-code-block';
import { ForgeTypography } from '../../atoms/forge-typography';
import { ForgeTable } from '../../organisms/forge-table';

import styles from './forge-markdown.module.scss';
import { MarkdownInline } from './markdown-inline';
import {
  decodeEntities,
  HEADING_VARIANT,
  type MarkdownSize,
  normalizeLanguage,
  tableColumns,
  tableRows,
} from './markdown-utils';

import type { Token, Tokens } from 'marked';

export interface MarkdownBlockProperties extends MpProperties {
  /** The single block token to render. */
  token: Token;
  /** Size token controlling the rendered text scale. */
  size?: MarkdownSize;
  /** Optional resolver for hyperlink targets (see `ForgeMarkdown`). */
  resolveHref?: (href: string) => string | undefined;
  /** Precomputed stable anchor ids, keyed by heading token identity. */
  headingIds?: Map<Token, string>;
}

/**
 * `MarkdownBlock` — the recursive block half of the `ForgeMarkdown` renderer. It
 * renders one block token as a real component: headings / paragraphs / raw HTML
 * through `ForgeTypography`, fenced code through `ForgeCodeBlock`, GFM tables
 * through `ForgeTable`, and recurses into its own tag for blockquote and
 * list-item children (mirroring `ForgeTreeViewItem`'s self-recursive pattern).
 */
export function MarkdownBlock(properties: Readonly<MarkdownBlockProperties>): MpElement {
  const { token, size = 'md', resolveHref, headingIds } = properties;
  const type = token.type;

  const heading = token as Tokens.Heading;
  const headingId = headingIds?.get(token);
  const headingVariant = HEADING_VARIANT[heading.depth] ?? 'h6';
  const code = token as Tokens.Code;
  const table = token as Tokens.Table;
  const list = token as Tokens.List;
  const blockquote = token as Tokens.Blockquote;
  const paragraph = token as Tokens.Paragraph;
  const textToken = token as Tokens.Text;
  const columns = type === 'table' ? tableColumns(table) : [];
  const rows = type === 'table' ? tableRows(table) : [];

  return type === 'heading' ? (
    <div
      className={styles['forge-markdown__heading']}
      id={headingId}
    >
      <ForgeTypography
        as={headingVariant}
        variant={headingVariant}
      >
        {heading.tokens?.map((child, index) => (
          <MarkdownInline
            key={index}
            resolveHref={resolveHref}
            token={child}
          />
        ))}
      </ForgeTypography>
    </div>
  ) : type === 'paragraph' ? (
    <ForgeTypography variant="body-md">
      {paragraph.tokens?.map((child, index) => (
        <MarkdownInline
          key={index}
          resolveHref={resolveHref}
          token={child}
        />
      ))}
    </ForgeTypography>
  ) : type === 'text' ? (
    <ForgeTypography
      as="span"
      variant="body-md"
    >
      {textToken.tokens
        ? textToken.tokens.map((child, index) => (
            <MarkdownInline
              key={index}
              resolveHref={resolveHref}
              token={child}
            />
          ))
        : decodeEntities(textToken.text)}
    </ForgeTypography>
  ) : type === 'code' ? (
    <ForgeCodeBlock
      code={code.text}
      language={normalizeLanguage(code.lang)}
      size={size}
    />
  ) : type === 'table' ? (
    <ForgeTable
      bordered
      columns={columns}
      rows={rows}
      size={size}
      striped
    />
  ) : type === 'blockquote' ? (
    <blockquote className={styles['forge-markdown__blockquote']}>
      {blockquote.tokens?.map((child, index) => (
        <MarkdownBlock
          key={index}
          headingIds={headingIds}
          resolveHref={resolveHref}
          size={size}
          token={child}
        />
      ))}
    </blockquote>
  ) : type === 'list' ? (
    list.ordered ? (
      <ol
        className={styles['forge-markdown__list']}
        start={typeof list.start === 'number' ? list.start : undefined}
      >
        {list.items.map((item, index) => (
          <li
            key={index}
            className={styles['forge-markdown__list-item']}
          >
            {item.task ? (
              <input
                checked={item.checked}
                className={styles['forge-markdown__task']}
                disabled
                type="checkbox"
              />
            ) : undefined}
            {item.tokens.map((child, childIndex) => (
              <MarkdownBlock
                key={childIndex}
                headingIds={headingIds}
                resolveHref={resolveHref}
                size={size}
                token={child}
              />
            ))}
          </li>
        ))}
      </ol>
    ) : (
      <ul className={styles['forge-markdown__list']}>
        {list.items.map((item, index) => (
          <li
            key={index}
            className={styles['forge-markdown__list-item']}
          >
            {item.task ? (
              <input
                checked={item.checked}
                className={styles['forge-markdown__task']}
                disabled
                type="checkbox"
              />
            ) : undefined}
            {item.tokens.map((child, childIndex) => (
              <MarkdownBlock
                key={childIndex}
                headingIds={headingIds}
                resolveHref={resolveHref}
                size={size}
                token={child}
              />
            ))}
          </li>
        ))}
      </ul>
    )
  ) : type === 'hr' ? (
    <hr className={styles['forge-markdown__hr']} />
  ) : type === 'html' ? (
    <ForgeTypography variant="body-md">{decodeEntities((token as Tokens.HTML).text)}</ForgeTypography>
  ) : (
    <span />
  );
}
