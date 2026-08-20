import { h, type MpChild, type MpElement } from '@mission-platform/forge';

import {
  colorValue,
  radiusValue,
  spacingValue,
  type EmailColor,
  type EmailRadiusScale,
  type EmailSpacingScale,
} from '@/tokens';

export interface EmailCardProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
  readonly background?: EmailColor;
  readonly borderColor?: EmailColor;
  readonly radius?: EmailRadiusScale;
  readonly padding?: EmailSpacingScale;
}

export function EmailCard(properties: Readonly<EmailCardProperties>): MpElement {
  const background = colorValue(properties.background ?? 'bg.surface');
  const borderColor = colorValue(properties.borderColor ?? 'border.default');
  return (
    <table
      role="presentation"
      width="100%"
      border={0}
      cellPadding={0}
      cellSpacing={0}
      style={{
        backgroundColor: background,
        border: `1px solid ${borderColor}`,
        borderRadius: radiusValue(properties.radius ?? 'md'),
      }}
    >
      <tbody>
        <tr>
          <td style={{ padding: spacingValue(properties.padding ?? 'lg') }}>{properties.children}</td>
        </tr>
      </tbody>
    </table>
  );
}
