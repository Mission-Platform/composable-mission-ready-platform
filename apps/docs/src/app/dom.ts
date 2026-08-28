/** Native hosts used by Forge Web Components that are registered as customized built-ins. */
const FORGE_CUSTOMIZED_BUILT_INS: Readonly<Record<string, keyof HTMLElementTagNameMap>> = {
  'forge-application-layout': 'div',
  'forge-badge': 'div',
  'forge-card': 'div',
  'forge-markdown': 'div',
  'forge-navbar': 'div',
  'forge-search-input': 'div',
  'forge-typography': 'span',
};

/**
 * Whether the browser upgrades one of Forge's customized built-ins. Safari/WebKit
 * does not support customized built-in elements, so an `is="forge-*"` host
 * otherwise remains an inert native element.
 */
export function supportsForgeCustomizedBuiltIn(tagName: string): boolean {
  const nativeTag = FORGE_CUSTOMIZED_BUILT_INS[tagName];
  const definition = globalThis.customElements?.get(tagName);
  if (nativeTag === undefined || definition === undefined) return false;

  try {
    return document.createElement(nativeTag, { is: tagName }) instanceof definition;
  } catch {
    return false;
  }
}

export function createElement<T extends HTMLElement>(
  tagName: string,
  properties: Record<string, unknown> = {},
  children: Iterable<Node | string> = [],
): T {
  const nativeTag = FORGE_CUSTOMIZED_BUILT_INS[tagName];
  const element = (
    nativeTag ? document.createElement(nativeTag, { is: tagName }) : document.createElement(tagName)
  ) as T;
  if (nativeTag) element.setAttribute('is', tagName);
  for (const [name, value] of Object.entries(properties)) {
    Reflect.set(element, name, value);
  }
  for (const child of children) {
    element.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return element;
}

export function text(value: string): Text {
  return document.createTextNode(value);
}
