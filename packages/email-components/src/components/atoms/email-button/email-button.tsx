import { validateUrl } from '@mission-platform/email-renderer';
import { h, type MpChild, type MpElement } from '@mission-platform/forge';

import {
  borderWidthValue,
  colorValue,
  controlColors,
  radiusValue,
  sizeValue,
  typographyStyle,
  type EmailColor,
  type EmailSizeScale,
} from '@/tokens';

export type EmailButtonVariant =
  'neutral' | 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'info' | 'error' | 'critical' | 'ghost';

export interface EmailButtonProperties {
  readonly href: string;
  readonly variant?: EmailButtonVariant;
  readonly size?: EmailSizeScale;
  readonly color?: EmailColor;
  readonly children?: MpChild | readonly MpChild[];
}

export function EmailButton(properties: Readonly<EmailButtonProperties>): MpElement {
  const variant = properties.variant ?? 'primary';
  const size = properties.size ?? 'md';
  const colors = controlColors(variant);
  const background = colors.background === 'transparent' ? 'transparent' : colorValue(colors.background);
  return (
    <table
      role="presentation"
      border={0}
      cellPadding={0}
      cellSpacing={0}
    >
      <tbody>
        <tr>
          <td
            align="center"
            bgcolor={background}
            style={{
              backgroundColor: background,
              border: colors.border ? `${borderWidthValue('thin')} solid ${colorValue(colors.border)}` : undefined,
              borderRadius: radiusValue('md'),
            }}
          >
            <a
              href={validateUrl(properties.href, 'href')}
              role="button"
              style={{
                ...typographyStyle('label'),
                color: colorValue(properties.color ?? colors.text),
                display: 'inline-block',
                fontSize: sizeValue(size, 'font'),
                lineHeight: typographyStyle('display').lineHeight,
                padding: `${sizeValue(size, 'pad-block')} ${sizeValue(size, 'pad-inline')}`,
                textDecoration: 'none',
              }}
            >
              {properties.children ?? properties.href}
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
