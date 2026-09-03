import { spacingValue } from '../../../tokens';

import type { EmailSpacingScale } from '../../../tokens';
import type { MpChild, MpElement } from '@mission-platform/forge';

export interface EmailColumnProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
  readonly width?: string | number;
  readonly align?: 'left' | 'center' | 'right';
  readonly valign?: 'top' | 'middle' | 'bottom';
  readonly stackOnMobile?: boolean;
  readonly padding?: EmailSpacingScale;
}

export function EmailColumn(properties: Readonly<EmailColumnProperties>): MpElement {
  const { children, width, align, valign, stackOnMobile, padding } = properties;
  return (
    <td
      class={stackOnMobile ? 'mp-email-stack' : undefined}
      width={width}
      align={align}
      valign={valign}
      style={padding ? { padding: spacingValue(padding) } : undefined}
    >
      {children}
    </td>
  );
}
