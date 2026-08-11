import { h, type MpChild, type MpElement } from '@mission-platform/forge';

import { EmailPreheader } from '@/components/organisms';

export interface EmailDocumentProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
  readonly previewText?: string;
}

export function EmailDocument(properties: Readonly<EmailDocumentProperties>): MpElement {
  const { children, previewText, ...rest } = properties;
  return (
    <div {...rest}>
      {previewText ? <EmailPreheader text={previewText} /> : undefined}
      {children}
    </div>
  );
}
