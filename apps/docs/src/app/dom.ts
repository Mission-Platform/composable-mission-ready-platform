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
