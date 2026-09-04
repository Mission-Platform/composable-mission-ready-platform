import { EmailPreheader } from '../../organisms';

import type { MpChild, MpElement } from '@mission-platform/forge-jsx';

export interface EmailDocumentProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
  readonly previewText?: string;
}

export function EmailDocument(properties: Readonly<EmailDocumentProperties>): MpElement {
  return (
    <div>
      {properties.previewText ? <EmailPreheader text={properties.previewText} /> : undefined}
      {properties.children}
    </div>
  );
}
