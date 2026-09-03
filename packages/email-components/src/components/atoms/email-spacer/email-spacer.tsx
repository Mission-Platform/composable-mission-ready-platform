import { spacingValue } from '../../../tokens';

import type { EmailSpacingScale } from '../../../tokens';
import type { MpElement } from '@mission-platform/forge';

export interface EmailSpacerProperties {
  readonly spacing?: EmailSpacingScale;
}

export function EmailSpacer(properties: Readonly<EmailSpacerProperties>): MpElement {
  const value = spacingValue(properties.spacing ?? 'md');
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
            height={value}
            style={{ fontSize: 0, height: value, lineHeight: 0 }}
          />
        </tr>
      </tbody>
    </table>
  );
}
