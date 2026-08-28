import { EmailImage } from '@/components/atoms';
import { EmailColumn, EmailRow } from '@/components/molecules';
import { colorValue, spacingValue, typographyStyle } from '@/tokens';

import type { MpChild, MpElement } from '@mission-platform/forge';

export interface EmailHeaderProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
  readonly logoSrc?: string;
  readonly logoAlt?: string;
  readonly logoWidth?: number;
  readonly brandName?: string;
}

export function EmailHeader(properties: Readonly<EmailHeaderProperties>): MpElement {
  const { children, logoSrc, logoAlt, logoWidth, brandName } = properties;
  return (
    <header style={{ backgroundColor: colorValue('bg.surface'), padding: spacingValue('md') }}>
      <EmailRow spacing="sm">
        <EmailColumn>
          {logoSrc ? (
            <EmailImage
              src={logoSrc}
              alt={logoAlt ?? brandName ?? 'Brand logo'}
              width={logoWidth}
              fluid
            />
          ) : (
            <strong style={{ ...typographyStyle('h5'), color: colorValue('text.primary') }}>{brandName}</strong>
          )}
        </EmailColumn>
        <EmailColumn align="right">{children}</EmailColumn>
      </EmailRow>
    </header>
  );
}
