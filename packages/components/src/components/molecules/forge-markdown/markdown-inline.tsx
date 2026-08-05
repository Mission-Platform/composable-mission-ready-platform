import { h, type MpElement, type MpProperties } from '@mission-platform/forge';

import { ForgeTypography } from '../../atoms/forge-typography';

import styles from './forge-markdown.module.scss';
import { decodeEntities, isAbsoluteHref } from './markdown-utils';

import type { Token, Tokens } from 'marked';

export interface MarkdownInlineProperties extends MpProperties {
  /** The single inline token to render. */
  token: Token;
  /** Optional resolver for hyperlink targets (see `ForgeMarkdown`). */
  resolveHref?: (href: string) => string | undefined;
}

/**
 * `MarkdownInline` — the recursive inline half of the `ForgeMarkdown` renderer.
 * It renders one inline token (`strong`, `em`, `del`, `codespan`, `link`,
 * `image`, `br`, `text`, `escape`) and recurses into its own tag for nested
 * runs, mirroring the self-recursive child-component pattern of
 * `ForgeTreeViewItem` so it compiles to a native recursive tag on every target.
 */
export function MarkdownInline(properties: Readonly<MarkdownInlineProperties>): MpElement {
  const { token, resolveHref } = properties;
  const type = token.type;

  // Link target resolution: a resolver hit marks the link internal; otherwise an
  // absolute link opens in a new tab.
  const link = token as Tokens.Link;
  const resolvedHref = type === 'link' ? resolveHref?.(link.href) : undefined;
  const linkIsInternal = resolvedHref !== undefined;
  const linkHref = resolvedHref ?? (type === 'link' ? link.href : undefined);
  const linkExternal = type === 'link' && !linkIsInternal && isAbsoluteHref(link.href);

  const childTokens = (token as { tokens?: Token[] }).tokens;
  const image = token as Tokens.Image;

  return type === 'strong' ? (
    <strong>
      {childTokens?.map((child, index) => (
        <MarkdownInline
          key={index}
          resolveHref={resolveHref}
          token={child}
        />
      ))}
    </strong>
  ) : type === 'em' ? (
    <em>
      {childTokens?.map((child, index) => (
        <MarkdownInline
          key={index}
          resolveHref={resolveHref}
          token={child}
        />
      ))}
    </em>
  ) : type === 'del' ? (
    <del>
      {childTokens?.map((child, index) => (
        <MarkdownInline
          key={index}
          resolveHref={resolveHref}
          token={child}
        />
      ))}
    </del>
  ) : type === 'codespan' ? (
    <ForgeTypography
      as="code"
      color="inherit"
      variant="code"
    >
      {decodeEntities((token as Tokens.Codespan).text)}
    </ForgeTypography>
  ) : type === 'br' ? (
    <br />
  ) : type === 'image' ? (
    <img
      alt={image.text}
      className={styles['forge-markdown__image']}
      src={image.href}
      title={image.title ?? undefined}
    />
  ) : type === 'link' ? (
    <a
      data-internal={linkIsInternal ? 'true' : undefined}
      href={linkHref}
      rel={linkExternal ? 'noopener noreferrer' : undefined}
      target={linkExternal ? '_blank' : undefined}
      title={link.title ?? undefined}
    >
      {childTokens?.map((child, index) => (
        <MarkdownInline
          key={index}
          resolveHref={resolveHref}
          token={child}
        />
      ))}
    </a>
  ) : type === 'text' && childTokens ? (
    <span>
      {childTokens.map((child, index) => (
        <MarkdownInline
          key={index}
          resolveHref={resolveHref}
          token={child}
        />
      ))}
    </span>
  ) : (
    <span>{decodeEntities((token as Tokens.Text).text ?? (token as { raw?: string }).raw ?? '')}</span>
  );
}
