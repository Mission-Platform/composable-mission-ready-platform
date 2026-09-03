import type { EmailNode } from '../render';

/** Options controlling Markdown tree generation. */
export interface MarkdownRenderOptions {
  readonly className?: string;
}

/** The result of parsing Markdown into the shared Forge tree pipeline. */
export interface MarkdownDocument {
  readonly node: EmailNode;
}
