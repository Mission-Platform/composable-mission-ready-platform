import { validateUrl } from '@mission-platform/email-renderer';
import { h, type MpChild, type MpElement } from '@mission-platform/forge-jsx';

import { spacingValue, type EmailSpacingScale } from '../../../tokens';

export interface EmailListItem {
  readonly children: MpChild | readonly MpChild[];
  readonly href?: string;
}

export interface EmailListProperties {
  readonly items: readonly EmailListItem[];
  readonly ordered?: boolean;
  readonly spacing?: EmailSpacingScale;
}

export function EmailList(properties: Readonly<EmailListProperties>): MpElement {
  const { items } = properties;
  return (
    <table
      role="list"
      width="100%"
      border={0}
      cellPadding={0}
      cellSpacing={0}
    >
      <tbody>
        {items.map((item) => (
          <tr role="listitem">
            <td
              valign="top"
              style={{ paddingBottom: spacingValue(properties.spacing ?? 'sm') }}
            >
              {properties.ordered ? undefined : '• '}
              {item.href
                ? h('a', { href: validateUrl(item.href, 'href') }, h('span', { children: item.children }))
                : h('span', { children: item.children })}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
