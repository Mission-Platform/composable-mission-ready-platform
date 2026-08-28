import { colorValue, spacingValue } from '@/tokens';

import type { EmailColor, EmailSpacingScale } from '@/tokens';
import type { MpChild, MpElement } from '@mission-platform/forge';

export interface EmailSectionProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
  readonly background?: EmailColor;
  readonly padding?: EmailSpacingScale;
}

export function EmailSection(properties: Readonly<EmailSectionProperties>): MpElement {
  return (
    <section style={{ margin: 0 }}>
      <table
        role="presentation"
        width="100%"
        border={0}
        cellPadding={0}
        cellSpacing={0}
        style={{ backgroundColor: colorValue(properties.background ?? 'bg.base') }}
      >
        <tbody>
          <tr>
            <td style={{ padding: spacingValue(properties.padding ?? 'lg') }}>{properties.children}</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}
