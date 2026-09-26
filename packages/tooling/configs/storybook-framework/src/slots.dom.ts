/**
 * DOM helpers shared by the slot-helper branches that build **real DOM** rather
 * than a framework virtual node: the Web-Component workbench (whose components
 * are custom elements fed by light-DOM children) and the Svelte workbench (whose
 * snippets mount into a host element).
 */

/** A value a story's JSX can produce as a child. */
type ChildValue = unknown;

/** Event handler property (`onClick`, `onUpdateOpen`, …). */
const EVENT_PROPERTY = /^on[A-Z]/;

/**
 * Whether `tag` names a custom element. Custom elements take their inputs as
 * **properties** (that is how the forge web-component emitter declares them),
 * while native elements take attributes and listeners.
 */
export function isCustomElementTag(tag: string): boolean {
  return tag.includes('-');
}

/**
 * Derive the registered tag name of a forge web component from its element
 * class. `customElements.getName` is the authoritative reverse lookup; the
 * class-name fallback mirrors the emitter's own `kebabCase(name)` registration
 * (`ForgeDropdownElement` → `forge-dropdown`).
 */
export function customElementTag(component: unknown): string {
  if (typeof component === 'function') {
    const registry = globalThis.customElements as
      (CustomElementRegistry & { getName?: (c: unknown) => string | null }) | undefined;
    const registered = registry?.getName?.(component);
    if (registered) {
      return registered;
    }
    return kebabCase((component as { name?: string }).name ?? '');
  }
  throw new TypeError('[storybook-framework] Expected a custom element class for the web-component renderer.');
}

/** `ForgeDropdownElement` → `forge-dropdown`. */
function kebabCase(name: string): string {
  return name
    .replace(/Element$/, '')
    .replaceAll(/([a-z\d])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

function applyStyleProperty(element: Element, value: unknown): void {
  if (typeof value === 'object' && value !== null) {
    Object.assign((element as HTMLElement).style, value);
  }
}

function applyCustomOrObjectProperty(element: Element, key: string, value: unknown, custom: boolean): void {
  if (!custom && EVENT_PROPERTY.test(key) && typeof value === 'function') {
    element.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
    return;
  }
  (element as unknown as Record<string, unknown>)[key] = value;
}

function applySingleProperty(element: Element, key: string, value: unknown, custom: boolean): void {
  if (key === 'children' || key === 'key' || value === undefined) {
    return;
  }
  if (key === 'style') {
    applyStyleProperty(element, value);
    return;
  }
  if (key === 'class' || key === 'className') {
    element.setAttribute('class', String(value));
    return;
  }
  if (custom || typeof value === 'object' || typeof value === 'function') {
    applyCustomOrObjectProperty(element, key, value, custom);
    return;
  }
  if (value === false || value === null) {
    return;
  }
  const attributeName = value === true ? key : toAttributeName(key);
  const attributeValue = value === true ? '' : String(value);
  element.setAttribute(attributeName, attributeValue);
}

/** Apply a JSX property bag to a real DOM element. */
export function applyProperties(element: Element, properties: Record<string, unknown> | null | undefined): void {
  if (!properties) {
    return;
  }
  const custom = isCustomElementTag(element.tagName.toLowerCase());
  for (const [key, value] of Object.entries(properties)) {
    applySingleProperty(element, key, value, custom);
  }
}

/** `ariaLabel` → `aria-label`, `htmlFor` → `for`; everything else is passed through. */
function toAttributeName(key: string): string {
  if (key === 'htmlFor') {
    return 'for';
  }
  return key.startsWith('aria') && key.length > 4 ? kebabCase(key) : key;
}

function isSkippableChild(child: ChildValue): boolean {
  return child === undefined || child === null || typeof child === 'boolean';
}

/** Append a JSX child (node, primitive, or nested array) to `parent`. */
export function appendChild(parent: ParentNode, child: ChildValue): void {
  if (isSkippableChild(child)) {
    return;
  }
  if (Array.isArray(child)) {
    for (const item of child) {
      appendChild(parent, item);
    }
    return;
  }
  if (child instanceof Node) {
    parent.append(child);
    return;
  }
  parent.append(String(child));
}

/**
 * Instantiates a DOM element or custom element host fallback.
 */
export function instantiateDomElement(tag: string): Element {
  let element = document.createElement(tag);
  const customConstructor = typeof customElements === 'undefined' ? undefined : customElements.get(tag);
  if (customConstructor && element instanceof customConstructor) {
    return element;
  }
  if (customConstructor || (element instanceof HTMLUnknownElement && isCustomElementTag(tag))) {
    element = document.createElement('div', { is: tag });
  }
  return element;
}

/** Build a real DOM element for a native tag with its JSX properties/children. */
export function createDomElement(
  tag: string,
  properties: Record<string, unknown> | null | undefined,
  children: readonly ChildValue[],
): Element {
  const element = instantiateDomElement(tag);
  applyProperties(element, properties);
  for (const child of children) {
    appendChild(element, child);
  }
  return element;
}

/**
 * Wrap slot content so it can carry a `slot="<name>"` attribute. Text nodes
 * cannot, so a primitive is wrapped in a `<span>` — a `<slot>` matches only
 * *element* children by name.
 */
export function asSlotElement(content: ChildValue, name: string): Element | undefined {
  if (content === undefined || content === null || typeof content === 'boolean') {
    return undefined;
  }
  if (content instanceof Element) {
    content.setAttribute('slot', name);
    return content;
  }
  const host = document.createElement('span');
  host.setAttribute('slot', name);
  appendChild(host, content);
  return host;
}
