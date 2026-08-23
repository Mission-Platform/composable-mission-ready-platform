import { h, type MpChild, type MpElement } from '@mission-platform/forge';

import { EmailDivider } from '@/components/atoms';
import { combineStyleValues, colorValue, spacingValue, typographyStyle } from '@/tokens';

export interface EmailFooterProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
  readonly text?: string;
}

export function EmailFooter(properties: Readonly<EmailFooterProperties>): MpElement {
  const { children, text } = properties;
  return (
    <footer style={{ padding: combineStyleValues([spacingValue('lg'), spacingValue('md'), spacingValue('md')]) }}>
      <EmailDivider />
      <p
        style={{
          ...typographyStyle('caption'),
          color: colorValue('text.tertiary'),
          margin: 0,
          textAlign: 'center',
        }}
      >
        {text}
      </p>
      {children}
    </footer>
  );
}
