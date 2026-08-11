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

/** Apply a JSX property bag to a real DOM element. */
export function applyProperties(element: Element, properties: Record<string, unknown> | null | undefined): void {
  if (!properties) {
    return;
  }
  const custom = isCustomElementTag(element.tagName.toLowerCase());
  for (const [key, value] of Object.entries(properties)) {
    if (key === 'children' || key === 'key' || value === undefined) {
      continue;
    }
    if (key === 'style' && typeof value === 'object' && value !== null) {
      Object.assign((element as HTMLElement).style, value);
      continue;
    }
    if (key === 'class' || key === 'className') {
      element.setAttribute('class', String(value));
      continue;
    }
    if (custom || typeof value === 'object' || typeof value === 'function') {
      // Custom elements (and any object/function value on a native element)
      // must be set as properties — an attribute would stringify them.
      if (!custom && EVENT_PROPERTY.test(key) && typeof value === 'function') {
        element.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
        continue;
      }
      (element as unknown as Record<string, unknown>)[key] = value;
      continue;
    }
    if (value === false || value === null) {
      continue;
    }
    element.setAttribute(value === true ? key : toAttributeName(key), value === true ? '' : String(value));
  }
}

/** `ariaLabel` → `aria-label`, `htmlFor` → `for`; everything else is passed through. */
function toAttributeName(key: string): string {
  if (key === 'htmlFor') {
    return 'for';
  }
  return key.startsWith('aria') && key.length > 4 ? kebabCase(key) : key;
}

/** Append a JSX child (node, primitive, or nested array) to `parent`. */
export function appendChild(parent: ParentNode, child: ChildValue): void {
  if (child === undefined || child === null || typeof child === 'boolean') {
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

/** Build a real DOM element for a native tag with its JSX properties/children. */
export function createDomElement(
  tag: string,
  properties: Record<string, unknown> | null | undefined,
  children: readonly ChildValue[],
): Element {
  const element = document.createElement(tag);
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
