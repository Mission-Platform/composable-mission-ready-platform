import { spacingValue } from '../../../tokens';

import type { EmailSpacingScale } from '../../../tokens';
import type { MpChild, MpElement } from '@mission-platform/forge';

export interface EmailRowProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
  readonly align?: 'left' | 'center' | 'right';
  readonly valign?: 'top' | 'middle' | 'bottom';
  readonly stackOnMobile?: boolean;
  readonly spacing?: EmailSpacingScale;
}

export function EmailRow(properties: Readonly<EmailRowProperties>): MpElement {
  const { children, align, valign, stackOnMobile, spacing } = properties;
  return (
    <table
      class={stackOnMobile ? 'mp-email-stack' : undefined}
      role="presentation"
      width="100%"
      border={0}
      cellPadding={0}
      cellSpacing={0}
      style={{ borderCollapse: 'collapse', borderSpacing: spacing ? spacingValue(spacing) : 0 }}
    >
      <tbody>
        <tr
          align={align}
          valign={valign}
        >
          {children}
        </tr>
      </tbody>
    </table>
  );
}
