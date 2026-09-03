import { Fragment, type MpChild, type MpElement, type MpPropertyBag } from '@mission-platform/forge';
import { createComponent, type Component, type JSX } from 'solid-js';
import { Dynamic } from 'solid-js/web';

import type { EmailNode } from '../render';

function renderChild(child: MpChild): JSX.Element {
  if (child === undefined || child === null || typeof child === 'boolean') {
    return '';
  }
  if (typeof child === 'string' || typeof child === 'number') {
    return child;
  }
  return renderToEmailSolid(child);
}

/** Render the shared Forge tree as Solid JSX for browser previews. */
export function renderToEmailSolid(node: EmailNode): JSX.Element {
  if (node.type === Fragment) {
    return node.children.map((child) => renderChild(child));
  }

  if (typeof node.type === 'function') {
    return renderToEmailSolid(node.type({ ...node.properties, children: node.children }));
  }

  const properties = { ...node.properties } as Record<string, unknown>;
  delete properties.children;
  const children = node.children.map((child) => renderChild(child));
  return createComponent(Dynamic, {
    component: node.type,
    ...properties,
    get children() {
      return children;
    },
  });
}

/** Wrap a Forge component as a Solid component. */
export function toEmailSolidComponent<P extends MpPropertyBag>(component: Component<P>): Component<P> {
  return (properties: P) => renderToEmailSolid(component(properties) as unknown as MpElement);
}
