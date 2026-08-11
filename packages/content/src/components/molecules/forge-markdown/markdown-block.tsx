import { ForgeTable, ForgeTypography } from '@mission-platform/components';
import { h, type MpElement } from '@mission-platform/forge';

import { ForgeCodeBlock } from '../../atoms/forge-code-block';
import { ForgeMermaid } from '../../atoms/forge-mermaid';

import styles from './forge-markdown.module.scss';
import { MarkdownInline } from './markdown-inline';
import {
  decodeEntities,
  HEADING_VARIANT,
  isMermaidLanguage,
  type MarkdownSize,
  normalizeLanguage,
  tableColumns,
  tableRows,
} from './markdown-utilities';

import type { Token, Tokens } from 'marked';

export interface MarkdownBlockProperties {
  /** The single block token to render. */
  token: Token;
  /** Size token controlling the rendered text scale. */
  size?: MarkdownSize;
  /** Optional resolver for hyperlink targets (see `ForgeMarkdown`). */
  resolveHref?: (href: string) => string | undefined;
  /** Precomputed stable anchor ids, keyed by heading token identity. */
  headingIds?: Map<Token, string>;
}

interface TokenTypes {
  heading: Tokens.Heading;
  paragraph: Tokens.Paragraph;
  text: Tokens.Text;
  code: Tokens.Code;
  html: Tokens.HTML;
  table: Tokens.Table;
  blockquote: Tokens.Blockquote;
  list: Tokens.List;
  hr: Tokens.Hr;
}
type TokenType = keyof TokenTypes;

function tokenIsType<TokenTypesList extends TokenTypes, TokenTypeSelection extends TokenType>(
  token: Token,
  type: TokenTypeSelection,
): token is TokenTypesList[TokenTypeSelection] {
  return token.type === type;
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

  return tokenIsType(token, 'heading') ? (
    <div
      className={styles['forge-markdown__heading']}
      id={headingIds?.get(token)}
    >
      <ForgeTypography
        as={HEADING_VARIANT[token.depth] ?? 'h6'}
        variant={HEADING_VARIANT[token.depth] ?? 'h6'}
      >
        {token.tokens?.map((child, index) => (
          <MarkdownInline
            key={index}
            resolveHref={resolveHref}
            token={child}
          />
        ))}
      </ForgeTypography>
    </div>
  ) : tokenIsType(token, 'paragraph') ? (
    <ForgeTypography variant="body-md">
      {token.tokens?.map((child, index) => (
        <MarkdownInline
          key={index}
          resolveHref={resolveHref}
          token={child}
        />
      ))}
    </ForgeTypography>
  ) : tokenIsType(token, 'text') ? (
    <ForgeTypography
      as="span"
      variant="body-md"
    >
      {token.tokens
        ? token.tokens.map((child, index) => (
            <MarkdownInline
              key={index}
              resolveHref={resolveHref}
              token={child}
            />
          ))
        : decodeEntities(token.text)}
    </ForgeTypography>
  ) : tokenIsType(token, 'code') ? (
    isMermaidLanguage(token.lang) ? (
      <ForgeMermaid code={token.text} />
    ) : (
      <ForgeCodeBlock
        code={token.text}
        language={normalizeLanguage(token.lang)}
        size={size}
      />
    )
  ) : tokenIsType(token, 'table') ? (
    <ForgeTable
      bordered
      columns={tableColumns(token)}
      rows={tableRows(token)}
      size={size}
      striped
    />
  ) : tokenIsType(token, 'blockquote') ? (
    <blockquote className={styles['forge-markdown__blockquote']}>
      {token.tokens?.map((child, index) => (
        <MarkdownBlock
          key={index}
          headingIds={headingIds}
          resolveHref={resolveHref}
          size={size}
          token={child}
        />
      ))}
    </blockquote>
  ) : tokenIsType(token, 'list') ? (
    token.ordered ? (
      <ol
        className={styles['forge-markdown__list']}
        start={typeof token.start === 'number' ? token.start : undefined}
      >
        {token.items.map((item, index) => (
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
        {token.items.map((item, index) => (
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
  ) : tokenIsType(token, 'hr') ? (
    <hr className={styles['forge-markdown__hr']} />
  ) : tokenIsType(token, 'html') ? (
    <ForgeTypography variant="body-md">{decodeEntities((token as Tokens.HTML).text)}</ForgeTypography>
  ) : (
    <span />
  );
}
