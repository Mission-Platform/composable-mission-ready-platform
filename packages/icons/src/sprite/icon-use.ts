import { h, type MpElement } from '@mission-platform/forge';

import { useIconHref } from './provider';

export interface IconUseProperties {
  readonly symbolId: string;
  readonly className?: string;
  readonly size: number;
  readonly color?: string;
  readonly ariaLabel?: string;
  readonly style?: Readonly<Record<string, string | number>>;
}

/** Shared accessible wrapper that references canonical sprite geometry. */
export function ForgeIconUse(properties: Readonly<IconUseProperties>): MpElement {
  return h(
    'div',
    { className: properties.className },
    h(
      'svg',
      {
        'aria-hidden': !properties.ariaLabel,
        'aria-label': properties.ariaLabel,
        height: properties.size,
        width: properties.size,
        fill: 'none',
        role: 'img',
        stroke: properties.color ?? 'currentColor',
        style: properties.style,
        viewBox: '0 0 24 24',
        xmlns: 'http://www.w3.org/2000/svg',
      },
      h('use', { href: useIconHref(properties.symbolId) }),
    ),
  );
}
