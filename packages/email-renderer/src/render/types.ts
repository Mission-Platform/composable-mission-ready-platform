import type { MpChild, MpComponent, MpElement, MpPropertyBag } from '@mission-platform/forge';

/** A framework-neutral Forge element accepted by the email serializer. */
export type EmailNode = MpElement;

/** A Forge component that can be used to compose email nodes. */
export type EmailComponent<P extends MpPropertyBag = MpPropertyBag> = MpComponent<P>;

/** Values accepted by the deterministic inline-style serializer. */
export interface EmailStyleValueWithFallback {
  readonly fallback: string;
  readonly value: string;
  toString(): string;
}

export type EmailStyleValue = number | string | EmailStyleValueWithFallback | null | undefined;

/** A style object whose keys are serialized in lexical order. */
export type EmailStyle = Readonly<Record<string, EmailStyleValue>>;

/** Options for rendering a complete email document. */
export interface RenderEmailOptions {
  readonly title?: string;
  readonly previewText?: string;
  readonly theme?: 'light';
  readonly responsive?: boolean;
}

/** Properties passed to a serialized Forge element after validation. */
export type EmailProperties = MpPropertyBag & {
  readonly style?: EmailStyle | string;
  readonly children?: MpChild | readonly MpChild[];
};
