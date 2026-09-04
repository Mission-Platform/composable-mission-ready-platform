import type { MpElement } from '@mission-platform/forge-jsx';

export interface EmailPreheaderProperties {
  readonly text: string;
}

export function EmailPreheader(properties: Readonly<EmailPreheaderProperties>): MpElement {
  return (
    <div
      aria-hidden="true"
      style={{ display: 'none', maxHeight: 0, maxWidth: 0, overflow: 'hidden', opacity: 0, msoHide: 'all' }}
    >
      {properties.text}
    </div>
  );
}
