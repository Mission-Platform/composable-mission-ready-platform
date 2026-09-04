import { createContext, h, type MpChild, type MpContext, type MpElement, useContext } from '@mission-platform/forge-jsx';

import { ICON_SYMBOL_DEFINITIONS } from './definitions';

import type { IconSpriteContextValue, IconSpriteProperties, IconSvgNode } from './types';

const DEFAULT_CONTEXT: IconSpriteContextValue = {};
export const IconSpriteContext: MpContext<IconSpriteContextValue> =
  createContext<IconSpriteContextValue>(DEFAULT_CONTEXT);

/** Mount one inline sprite host for a subtree of icon components. */
export function IconSpriteProvider(properties: Readonly<IconSpriteProperties>): MpElement {
  const inline = properties.inline ?? !properties.src;
  const host = inline ? h(SpriteHost, {}) : undefined;
  const children = properties.children;
  const renderedChildren: MpChild[] = host === undefined ? [] : [host];
  if (Array.isArray(children)) {
    renderedChildren.push(...children);
  } else if (children !== undefined) {
    renderedChildren.push(children as MpChild);
  }

  return h(IconSpriteContext.Provider, { value: { src: properties.src }, children: renderedChildren });
}

function SpriteHost(): MpElement {
  const symbols = ICON_SYMBOL_DEFINITIONS.map((definition) =>
    h(
      'symbol',
      { id: definition.id, viewBox: definition.viewBox },
      ...definition.nodes.map((node) => renderNode(node)),
      ...(definition.uses ?? []).map((use) =>
        h('use', {
          href: `#${use.symbolId}`,
          ...(use.transform ? { transform: use.transform } : {}),
          ...use.properties,
        }),
      ),
    ),
  );
  return h(
    'svg',
    { 'aria-hidden': 'true', focusable: 'false', height: 0, width: 0, style: { position: 'absolute' } },
    h('defs', {}, ...symbols),
  );
}

function renderNode(node: IconSvgNode): MpElement {
  return h(
    node.element,
    node.attributes,
    ...(node.textContent === undefined ? [] : [node.textContent]),
    ...(node.children?.map((child) => renderNode(child)) ?? []),
  );
}

/** Resolve a local or external symbol URL for an icon wrapper. */
export function useIconHref(symbolId: string): string {
  const context = useContext(IconSpriteContext);
  return `${context.src ?? ''}#${symbolId}`;
}

export type { IconSpriteProperties } from './types';
