/** The current version of the canonical content document format. */
export const CONTENT_DOCUMENT_VERSION = 1 as const;

export type ContentAlign = 'left' | 'center' | 'right' | 'justify';

export type ContentMark = { type: 'strong' } | { type: 'emphasis' } | { type: 'underline' } | { type: 'strikethrough' };

export interface TextNode {
  type: 'text';
  value: string;
  marks?: ContentMark[];
}

export interface InlineCodeNode {
  type: 'inline-code';
  value: string;
}

export interface LinkNode {
  type: 'link';
  url: string;
  title?: string;
  children: ContentInline[];
}

export interface ImageInlineNode {
  type: 'image';
  src: string;
  alt: string;
  title?: string;
}

export interface RawHtmlInlineNode {
  type: 'raw-html';
  value: string;
}

export type ContentInline = TextNode | InlineCodeNode | LinkNode | ImageInlineNode | RawHtmlInlineNode;

export interface ParagraphBlock {
  type: 'paragraph';
  children: ContentInline[];
  align?: ContentAlign;
}

export interface HeadingBlock {
  type: 'heading';
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: ContentInline[];
  align?: ContentAlign;
}

export interface ListItem {
  type: 'list-item';
  children: ContentBlock[];
}

export interface ListBlock {
  type: 'list';
  ordered: boolean;
  start?: number;
  items: ListItem[];
  align?: ContentAlign;
}

export interface QuoteBlock {
  type: 'quote';
  children: ContentBlock[];
  align?: ContentAlign;
}

export interface CodeBlock {
  type: 'code';
  value: string;
  language?: string;
  meta?: string;
  align?: ContentAlign;
}

export interface ImageBlock {
  type: 'image';
  src: string;
  alt: string;
  title?: string;
  align?: ContentAlign;
}

export interface RawHtmlBlock {
  type: 'raw-html';
  value: string;
}

export type ContentBlock =
  ParagraphBlock | HeadingBlock | ListBlock | QuoteBlock | CodeBlock | ImageBlock | RawHtmlBlock;

export interface ContentDocument {
  version: typeof CONTENT_DOCUMENT_VERSION;
  type: 'document';
  children: ContentBlock[];
}

export type ContentBuilder<TOutput, TOptions = undefined> = (document: ContentDocument, options?: TOptions) => TOutput;
