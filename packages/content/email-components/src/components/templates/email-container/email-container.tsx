import { colorValue, containerWidthValue } from '../../../tokens';

import type { MpChild, MpElement } from '@mission-platform/forge-jsx';

export interface EmailContainerProperties {
  /** The content rendered inside the component. */
  children?: MpChild | readonly MpChild[];
  readonly width?: 'sm' | 'md' | 'lg';
  readonly background?: 'bg.base' | 'bg.surface' | 'bg.raised';
}

export function EmailContainer(properties: Readonly<EmailContainerProperties>): MpElement {
  return (
    <table
      class="mp-email-container"
      role="presentation"
      width="100%"
      border={0}
      cellPadding={0}
      cellSpacing={0}
      style={{
        backgroundColor: colorValue(properties.background ?? 'bg.base'),
        margin: '0 auto',
        maxWidth: containerWidthValue(properties.width ?? 'md'),
        borderCollapse: 'collapse',
        width: '100%',
      }}
    >
      <tbody>
        <tr>
          <td>{properties.children}</td>
        </tr>
      </tbody>
    </table>
  );
}
