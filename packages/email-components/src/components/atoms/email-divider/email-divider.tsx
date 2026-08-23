import { h, type MpElement } from '@mission-platform/forge';

import {
  borderWidthValue,
  combineStyleValues,
  colorValue,
  spacingValue,
  type EmailColor,
  type EmailSpacingScale,
} from '@/tokens';

export interface EmailDividerProperties {
  readonly color?: EmailColor;
  readonly spacing?: EmailSpacingScale;
}

export function EmailDivider(properties: Readonly<EmailDividerProperties>): MpElement {
  return (
    <table
      role="presentation"
      width="100%"
      border={0}
      cellPadding={0}
      cellSpacing={0}
    >
      <tbody>
        <tr>
          <td
            style={{
              borderTop: combineStyleValues([
                borderWidthValue('thin'),
                'solid',
                colorValue(properties.color ?? 'border.default'),
              ]),
              fontSize: 0,
              lineHeight: 0,
              paddingTop: spacingValue(properties.spacing ?? 'md'),
            }}
          />
        </tr>
      </tbody>
    </table>
  );
}
