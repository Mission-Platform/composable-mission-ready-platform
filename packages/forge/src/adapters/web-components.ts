/**
 * Native Web-Components runtime for the framework-neutral JSX toolchain.
 *
 * `@mission-platform/vite-plugin-forge` compiles a write-once neutral component
 * to a custom element by lifting its function into a `class X extends
 * {@link ForgeElement}` and converting its returned JSX to a tagged
 * {@link html}`…` template. This module is the tiny (zero-dependency) reactive
 * runtime those generated elements import — a native `HTMLElement` replacement
 * for Lit that speaks the **same template dialect** the generator already emits:
 *
 * - `${expr}` holes in child position become text / nested elements / arrays,
 * - `name=${expr}` → a plain attribute (removed when the value is
 *   `null`/`undefined`/`false`/{@link nothing}),
 * - `?name=${expr}` → a boolean attribute (`toggleAttribute`),
 * - `.name=${expr}` → an element **property** assignment,
 * - `@name=${expr}` → an `addEventListener('name', …)` binding,
 * - a `${cond ? html`…` : nothing}` / `${list.map(item => html`…`)}` hole
 *   renders nested templates / lists.
 *
 * Reactivity mirrors Lit's `static properties` contract: each declared property
 * (and `{ state: true }` internal state) becomes a prototype accessor whose
 * setter schedules a microtask re-render. Rendering is a full rebuild of the
 * element's shadow root from the current template — correct and framework-parity
 * accurate (identical resulting DOM), trading Lit's fine-grained diffing for a
 * dependency-free implementation.
 */

/** A reactive-property declaration on a {@link ForgeElement} subclass. */
export interface PropertyDeclaration {
  /** When `true`, the property is internal render state (no observed attribute). */
  state?: boolean;
}

/**
 * Sentinel rendered as "no value": in child position it produces nothing, in
 * attribute position it removes the attribute — the native equivalent of
 * lit-html's `nothing`.
 */
export const nothing: unique symbol = Symbol('@mission-platform/forge:nothing');

/** A parsed `html\`…\`` result: the static strings plus the interpolated values. */
export class TemplateResult {
  readonly strings: TemplateStringsArray;
  readonly values: readonly unknown[];
  constructor(strings: TemplateStringsArray, values: readonly unknown[]) {
    this.strings = strings;
    this.values = values;
  }
}

/**
 * Tagged-template factory. Captures the call site's static strings and dynamic
 * values into a {@link TemplateResult} for {@link render} to realise into DOM.
 */
export function html(strings: TemplateStringsArray, ...values: readonly unknown[]): TemplateResult {
  return new TemplateResult(strings, values);
}

/** How a single `${…}` hole binds once its surrounding markup is parsed. */
type Part =
  | { readonly kind: 'node'; readonly id: number }
  | { readonly kind: 'attr'; readonly id: number; readonly prefix: '' | '?' | '.' | '@'; readonly name: string };

/** A compiled template: the marker-annotated static HTML plus its ordered parts. */
interface CompiledTemplate {
  readonly html: string;
  readonly parts: readonly Part[];
}

/** Cache of compiled templates keyed by the (stable) tagged-template `strings`. */
const templateCache = new WeakMap<TemplateStringsArray, CompiledTemplate>();

/** Matches the trailing `name=` / `?name=` / `.name=` / `@name=` attribute token. */
const ATTRIBUTE_TAIL = /([.?@]?)([\w-]+)=$/;

/**
 * Compile a template's static strings into marker-annotated HTML plus the list
 * of parts describing each hole. A hole inside a tag becomes a marker attribute
 * (`data-mpbind-<id>`) on its element; a hole in child position becomes a
 * `<!--mp:<id>-->` comment marker.
 */
function compileTemplate(strings: TemplateStringsArray): CompiledTemplate {
  const parts: Part[] = [];
  let out = '';
  let inTag = false;
  let quote = '';
  for (let index = 0; index < strings.length; index += 1) {
    const segment = strings[index] ?? '';
    for (const character of segment) {
      if (quote !== '') {
        if (character === quote) {
          quote = '';
        }
      } else if (inTag) {
        if (character === '"' || character === "'") {
          quote = character;
        } else if (character === '>') {
          inTag = false;
        }
      } else if (character === '<') {
        inTag = true;
      }
    }
    out += segment;
    if (index >= strings.length - 1) {
      continue;
    }
    const id = parts.length;
    if (inTag && quote === '') {
      const match = ATTRIBUTE_TAIL.exec(out);
      if (match !== null) {
        const prefix = match[1] as '' | '?' | '.' | '@';
        const name = match[2] ?? '';
        out = `${out.slice(0, out.length - match[0].length)} data-mpbind-${id}`;
        parts.push({ kind: 'attr', id, prefix, name });
        continue;
      }
    }
    out += `<!--mp:${id}-->`;
    parts.push({ kind: 'node', id });
  }
  return { html: out, parts };
}

/** Compile (memoised) a {@link TemplateResult}'s static strings. */
function compileCached(strings: TemplateStringsArray): CompiledTemplate {
  const cached = templateCache.get(strings);
  if (cached !== undefined) {
    return cached;
  }
  const compiled = compileTemplate(strings);
  templateCache.set(strings, compiled);
  return compiled;
}

/** Whether a value renders as empty (produces no child node). */
function isEmptyValue(value: unknown): boolean {
  return value === nothing || value === null || value === undefined || value === false || value === true;
}

/** Realise a child-position value into an ordered list of DOM nodes. */
function valueToNodes(value: unknown): Node[] {
  if (isEmptyValue(value)) {
    return [];
  }
  if (value instanceof TemplateResult) {
    return [instantiate(value)];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => valueToNodes(item));
  }
  if (value instanceof Node) {
    return [value];
  }
  return [document.createTextNode(String(value))];
}

/** Apply an attribute/property/event/boolean binding onto an element. */
function applyAttributePart(element: Element, part: Extract<Part, { kind: 'attr' }>, value: unknown): void {
  const { prefix, name } = part;
  if (prefix === '@') {
    if (typeof value === 'function') {
      element.addEventListener(name, value as EventListener);
    }
    return;
  }
  if (prefix === '?') {
    element.toggleAttribute(name, Boolean(value) && value !== nothing);
    return;
  }
  if (prefix === '.') {
    (element as unknown as Record<string, unknown>)[name] = value === nothing ? undefined : value;
    return;
  }
  if (value === nothing || value === null || value === undefined || value === false) {
    element.removeAttribute(name);
    return;
  }
  element.setAttribute(name, value === true ? '' : String(value));
}

/** Find the comment marker `mp:<id>` under `root`. */
function findMarker(root: Node, id: number): Comment | undefined {
  const target = `mp:${id}`;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
  let current = walker.nextNode();
  while (current !== null) {
    if ((current as Comment).data === target) {
      return current as Comment;
    }
    current = walker.nextNode();
  }
  return undefined;
}

/** Realise a {@link TemplateResult} into a `DocumentFragment` with all bindings applied. */
function instantiate(result: TemplateResult): DocumentFragment {
  const compiled = compileCached(result.strings);
  const template = document.createElement('template');
  template.innerHTML = compiled.html;
  const fragment = template.content.cloneNode(true) as DocumentFragment;
  for (const part of compiled.parts) {
    const value = result.values[part.id];
    if (part.kind === 'attr') {
      const element = fragment.querySelector(`[data-mpbind-${part.id}]`);
      if (element !== null) {
        element.removeAttribute(`data-mpbind-${part.id}`);
        applyAttributePart(element, part, value);
      }
      continue;
    }
    const marker = findMarker(fragment, part.id);
    if (marker === undefined) {
      continue;
    }
    const nodes = valueToNodes(value);
    for (const node of nodes) {
      marker.parentNode?.insertBefore(node, marker);
    }
    marker.remove();
  }
  return fragment;
}

/**
 * Render a {@link TemplateResult} into `container`, replacing its current
 * content. A full rebuild (no diffing) — correct and parity-accurate.
 */
export function render(result: TemplateResult, container: ParentNode): void {
  container.replaceChildren(instantiate(result));
}

/**
 * Native `HTMLElement` base class for generated custom elements — a
 * dependency-free stand-in for `LitElement`.
 *
 * A subclass declares its reactive surface via `static properties` (mirroring
 * Lit): each key becomes a prototype accessor whose setter schedules a
 * microtask re-render, and each non-`state` key observes its lower-cased
 * attribute. `render()` returns the element's {@link html}`…` template, rendered
 * into an open shadow root.
 */
export class ForgeElement extends HTMLElement {
  /** Reactive property declarations (overridden by each generated subclass). */
  static readonly properties: Record<string, PropertyDeclaration> = {};

  /** The observed attributes — the lower-cased names of every non-state property. */
  static get observedAttributes(): string[] {
    this.finalize();
    return Object.entries(this.properties)
      .filter(([, declaration]) => declaration.state !== true)
      .map(([name]) => name.toLowerCase());
  }

  /** Backing store for reactive property/state values. */
  private readonly mpValues = new Map<string, unknown>();

  /** The element's open shadow root, rendered into on every update. */
  private readonly mpRoot: ShadowRoot;

  /** Whether a re-render is already scheduled for the current microtask. */
  private mpDirty = false;

  /**
   * Define the reactive accessors for this subclass's `static properties` on the
   * prototype (once per class). Each setter stores to {@link mpValues} and
   * schedules a re-render when the value changes.
   */
  private static finalize(): void {
    if (Object.prototype.hasOwnProperty.call(this, 'mpFinalized')) {
      return;
    }
    const prototype = this.prototype as ForgeElement;
    for (const name of Object.keys(this.properties)) {
      if (Object.prototype.hasOwnProperty.call(prototype, name)) {
        continue;
      }
      Object.defineProperty(prototype, name, {
        configurable: true,
        enumerable: true,
        get(this: ForgeElement): unknown {
          return this.mpValues.get(name);
        },
        set(this: ForgeElement, value: unknown): void {
          if (this.mpValues.get(name) !== value) {
            this.mpValues.set(name, value);
            this.requestUpdate();
          }
        },
      });
    }
    Object.defineProperty(this, 'mpFinalized', { value: true });
  }

  constructor() {
    super();
    (this.constructor as typeof ForgeElement).finalize();
    this.mpRoot = this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    this.adoptAttributes();
    this.renderRoot();
  }

  attributeChangedCallback(name: string, _previous: string | null, value: string | null): void {
    const propertyName = this.attributeToProperty(name);
    if (propertyName !== undefined) {
      (this as unknown as Record<string, unknown>)[propertyName] = value;
    }
  }

  /** Reflect any attributes already present on the host onto their properties. */
  private adoptAttributes(): void {
    for (const attribute of this.attributes) {
      const propertyName = this.attributeToProperty(attribute.name);
      if (propertyName !== undefined && this.mpValues.get(propertyName) === undefined) {
        (this as unknown as Record<string, unknown>)[propertyName] = attribute.value;
      }
    }
  }

  /** Resolve a (lower-cased) attribute name back to its declared property name. */
  private attributeToProperty(attribute: string): string | undefined {
    const { properties } = this.constructor as typeof ForgeElement;
    return Object.keys(properties).find((name) => name.toLowerCase() === attribute);
  }

  /** Schedule a shadow-root re-render on the next microtask (coalescing writes). */
  requestUpdate(): void {
    if (this.mpDirty) {
      return;
    }
    this.mpDirty = true;
    queueMicrotask(() => {
      this.mpDirty = false;
      if (this.isConnected) {
        this.renderRoot();
      }
    });
  }

  /** Render the current template into the shadow root. */
  private renderRoot(): void {
    render(this.render(), this.mpRoot);
  }

  /** The element's template. Overridden by every generated subclass. */
  render(): TemplateResult {
    return html`<slot></slot>`;
  }
}
