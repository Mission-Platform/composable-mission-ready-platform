import { h, type MpChild, type MpElement } from '@mission-platform/forge';

import { spacingValue, type EmailSpacingScale } from '@/tokens';

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
  const { children, width, align, valign, stackOnMobile, padding, ...rest } = properties;
  return (
    <td
      {...rest}
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
