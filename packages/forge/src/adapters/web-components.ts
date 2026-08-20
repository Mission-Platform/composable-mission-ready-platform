import {
  materializeTree,
  materializeValue,
  DomTemplateInstance,
  renderIncrementally,
  TemplateInstance,
  type DomTemplateDefinition,
  type MaterializedTree,
} from './web-components-renderer';

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
 * setter schedules a microtask re-render. Standalone `render()` calls update
 * persistent template instances incrementally, retaining static DOM and native
 * form state while preserving this dependency-free implementation.
 */

/** A reactive-property declaration on a {@link ForgeElement} subclass. */
export interface PropertyDeclaration {
  /** When `true`, the property is internal render state (no observed attribute). */
  state?: boolean;
}

/**
 * The static stylesheet contract implemented by generated Forge elements.
 *
 * URLs are kept on the element class rather than in the document so a shadow
 * root can load the compiled sidecars that document-level styles cannot reach.
 */
export interface ForgeElementConstructor {
  readonly styleUrls?: readonly string[];
  readonly shadow?: WebComponentsShadowPolicy;
  readonly internals?: WebComponentsInternalsPolicy;
  readonly formAssociated?: boolean;
}

/** Typed shadow-root options accepted by generated Forge elements. */
export interface WebComponentsShadowPolicy {
  readonly mode: 'open' | 'closed';
  readonly delegatesFocus?: boolean;
  readonly serializable?: boolean;
  readonly clonable?: boolean;
  readonly slotAssignment?: 'named' | 'manual';
}

/** Capability requests for the platform's {@link ElementInternals} API. */
export interface WebComponentsInternalsPolicy {
  readonly attach: boolean;
  readonly aria?: Readonly<Record<string, string>>;
  readonly formAssociated?: boolean;
  readonly formValue?: string;
}

/** A constructable native element class accepted by {@link ForgeElementMixin}. */
export type ForgeElementHostConstructor = new (...args: any[]) => HTMLElement;

/** Compatibility defaults used when a generated class does not override policy. */
export const DEFAULT_WEBCOMPONENTS_SHADOW_POLICY: WebComponentsShadowPolicy = {
  mode: 'open',
};

/** Internals are harmlessly capability-gated; form association remains opt-in. */
export const DEFAULT_WEBCOMPONENTS_INTERNALS_POLICY: WebComponentsInternalsPolicy = {
  attach: true,
};

/** Keep importing generated modules safe in Node/SSR processes without a DOM. */
const ForgeHTMLElement = (typeof HTMLElement === 'undefined' ? class {} : HTMLElement) as typeof HTMLElement;
const nativeChildrenGetter = Object.getOwnPropertyDescriptor(ForgeHTMLElement.prototype, 'children')?.get;

function shadowRootInitOf(policy: WebComponentsShadowPolicy): ShadowRootInit {
  const init: ShadowRootInit = { mode: policy.mode };
  if (policy.delegatesFocus !== undefined) {
    init.delegatesFocus = policy.delegatesFocus;
  }
  if (policy.serializable !== undefined) {
    (init as ShadowRootInit & { serializable?: boolean }).serializable = policy.serializable;
  }
  if (policy.clonable !== undefined) {
    (init as ShadowRootInit & { clonable?: boolean }).clonable = policy.clonable;
  }
  if (policy.slotAssignment !== undefined) {
    init.slotAssignment = policy.slotAssignment;
  }
  return init;
}

/** Attach a policy root, retrying without newer options on older engines. */
function attachShadowWithPolicy(host: Element, policy: WebComponentsShadowPolicy): ShadowRoot | undefined {
  if (typeof host.attachShadow !== 'function') {
    return undefined;
  }
  const init = shadowRootInitOf(policy);
  try {
    return host.attachShadow(init);
  } catch {
    // Optional ShadowRootInit members are not uniformly implemented. Retain
    // the requested mode and use the older, universally supported shape.
    try {
      return host.attachShadow({ mode: policy.mode, delegatesFocus: policy.delegatesFocus });
    } catch {
      try {
        return host.attachShadow({ mode: policy.mode });
      } catch {
        return undefined;
      }
    }
  }
}

function internalsPropertyName(name: string): string {
  if (!name.startsWith('aria-')) {
    return name;
  }
  return `aria${name.slice(5).replace(/(^|-)([a-z])/g, (_match, _separator, letter: string) => letter.toUpperCase())}`;
}

function ariaAttributeName(name: string): string {
  if (name === 'role' || name.startsWith('aria-')) {
    return name;
  }
  return `aria-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
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

/** A direct-DOM generated result with a stable definition identity. */
export class DomTemplateResult {
  readonly definition: DomTemplateDefinition;
  readonly values: readonly unknown[];

  constructor(definition: DomTemplateDefinition, values: readonly unknown[]) {
    this.definition = definition;
    this.values = values;
  }
}

/** A trusted raw-HTML value used by the native Web-Components adapter. */
export class RawHtml {
  readonly value: string;

  constructor(value: string) {
    this.value = value;
  }
}

/** Mark a string as trusted child markup for the native Web-Components path. */
export function unsafeHtml(value: string): RawHtml {
  return new RawHtml(value);
}

/** Properties accepted by the native Web-Components HtmlContent helper. */
export interface HtmlContentProperties {
  html: string;
  as?: string;
  ref?: unknown;
  children?: never;
  [key: string]: unknown;
}

/** A native host plus trusted raw child markup, rendered by {@link render}. */
export class HtmlContentResult {
  readonly properties: HtmlContentProperties;

  constructor(properties: HtmlContentProperties) {
    this.properties = properties;
  }
}

/** A runtime-selected element and its children for a computed JSX tag. */
export class DynamicElementResult {
  readonly tag: unknown;
  readonly properties: Readonly<Record<string, unknown>>;
  readonly children: readonly unknown[];

  constructor(tag: unknown, properties: Readonly<Record<string, unknown>>, children: readonly unknown[]) {
    this.tag = tag;
    this.properties = properties;
    this.children = children;
  }
}

/** Build a native Web-Components element whose tag is selected at runtime. */
export function dynamicElement(
  tag: unknown,
  properties: Readonly<Record<string, unknown>>,
  ...children: readonly unknown[]
): DynamicElementResult {
  return new DynamicElementResult(tag, properties, children);
}

/** Build a native Web-Components raw-content result without escaping `html`. */
export function HtmlContent(properties: HtmlContentProperties): HtmlContentResult {
  return new HtmlContentResult(properties);
}

/**
 * Tagged-template factory. Captures the call site's static strings and dynamic
 * values into a {@link TemplateResult} for {@link render} to realise into DOM.
 */
export function html(strings: TemplateStringsArray, ...values: readonly unknown[]): TemplateResult {
  return new TemplateResult(strings, values);
}

/** The prefix every {@link useId} value carries, so a generated id is recognisable. */
const ID_PREFIX = 'forge-';

/** Monotonically increasing counter backing {@link useId}. */
let idCounter = 0;

/**
 * The native target's replacement for React's `useId`.
 *
 * The neutral vocabulary offers `useId()` for the ids that tie a control to its
 * `<label for>` / `aria-describedby`; React maps it to its own `useId` and Solid
 * to `createUniqueId`, but a custom element has no framework runtime to borrow
 * one from — so this is it.
 *
 * A module-level counter is sufficient here, and deliberately simpler than a
 * random/hashed generator: an id only has to be unique **within a document**,
 * and the compiler lifts a `const x = useId()` out of `render()` into an
 * instance field, so each element instance calls this exactly once and then
 * keeps its id for its whole lifetime. Successive calls therefore never
 * collide, no dependency (nanoid, `crypto.randomUUID`) is needed, and the
 * result is stable and debuggable (`forge-1`, `forge-2`, …). The value is a
 * valid HTML `id` and a valid CSS identifier, so it can be used in a selector
 * unescaped.
 */
export function useId(): string {
  idCounter += 1;
  return `${ID_PREFIX}${idCounter}`;
}

/** The slot unnamed light-DOM content is projected into. */
const DEFAULT_SLOT = 'default';

/**
 * Whether `host` was given content for one of its slots — the native target's
 * replacement for the neutral `hasSlot('x')` marker.
 *
 * `hasSlot` is compile-time vocabulary: Vue lowers it to `!!slots.x`, React to
 * `properties.x != null`, and a custom element has neither, so the check is made
 * against the DOM instead. A generated element renders into an **open shadow
 * root**, which means the content a consumer projects stays in the host's
 * **light** DOM as its children — a named slot is filled by a child carrying
 * `slot="<name>"`, and the default slot by any child that carries none. Only
 * direct children are considered, exactly like slot assignment itself, and a
 * whitespace-only text node does not count as content.
 *
 * The children are walked rather than queried with `[slot="…"]` so a slot name
 * needs no CSS escaping, and so a bare text child (which no selector can match)
 * still fills the default slot.
 *
 * Note that a slot is only observable once the host's children exist: during the
 * parser's upgrade of an element written in the initial HTML, `connectedCallback`
 * runs before they are attached. Content projected later re-renders the element
 * through the usual reactive path.
 */
export function hasSlotContent(host: Element, name?: string): boolean {
  const target = name === undefined || name.length === 0 ? DEFAULT_SLOT : name;
  for (const child of host.childNodes) {
    if (child instanceof Element) {
      if ((child.getAttribute('slot') ?? DEFAULT_SLOT) === target) {
        return true;
      }
      continue;
    }
    if (target === DEFAULT_SLOT && (child.textContent ?? '').trim().length > 0) {
      return true;
    }
  }
  return false;
}

/** Runtime marker emitted by the Web-Components compiler for ambiguous slots. */
export interface ForgeSlotMarker extends HTMLElement {
  content?: unknown;
  name?: unknown;
}

/** The element that authored a projected node, used when styles cross roots. */
const projectionOwners = new WeakMap<Node, ForgeElement>();

/** Remember the stylesheet owner of a node before projection can move it. */
function rememberProjectionOwner(nodes: readonly Node[], owner: ForgeElement): void {
  for (const node of nodes) {
    if (!projectionOwners.has(node)) {
      projectionOwners.set(node, owner);
    }
  }
}

/** Mount stylesheet links into a shadow root without duplicating existing URLs. */
function mountStylesIntoRoot(root: ShadowRoot, styleUrls: readonly string[]): void {
  const mounted = new Set(
    [...root.querySelectorAll<HTMLLinkElement>('link[data-mp-forge-style]')].map((style) => style.dataset.mpForgeStyle),
  );
  for (const styleUrl of styleUrls) {
    if (styleUrl.length === 0 || mounted.has(styleUrl)) {
      continue;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = styleUrl;
    link.dataset.mpForgeStyle = styleUrl;
    root.append(link);
    mounted.add(styleUrl);
  }
}

/** Read a marker's static attribute or dynamic property as a native slot name. */
function slotNameOf(marker: ForgeSlotMarker): string {
  const dynamicName = Object.prototype.hasOwnProperty.call(marker, 'name') ? marker.name : undefined;
  const name = dynamicName ?? marker.getAttribute('name');
  return typeof name === 'string' && name.length > 0 ? name : DEFAULT_SLOT;
}

/** Select direct light-DOM children belonging to a native slot name. */
function childrenForSlot(children: readonly Node[], name: string): Node[] {
  return children.filter((child) => {
    if (child instanceof Element) {
      return (child.getAttribute('slot') ?? DEFAULT_SLOT) === name;
    }
    return name === DEFAULT_SLOT;
  });
}

/** Whether a marker has a compiler-assigned `.content` property. */
function hasMarkerContent(marker: ForgeSlotMarker): boolean {
  return Object.prototype.hasOwnProperty.call(marker, 'content');
}

/** Whether a render tree contains more than one outlet for a slot name. */
function hasRepeatedSlotOutlet(root: ParentNode, name: string): boolean {
  const outlets = [...root.querySelectorAll<HTMLElement>('slot, [data-mp-forge-slot]')];
  return (
    outlets.filter((outlet) => {
      if (outlet.matches('slot')) {
        return (outlet.getAttribute('name') ?? DEFAULT_SLOT) === name;
      }
      const marker = outlet as ForgeSlotMarker;
      return slotNameOf(marker) === name;
    }).length > 1
  );
}

/** Preserve reactive properties when a projected custom element must be cloned. */
function cloneProjectedNode(node: Node): Node {
  const clone = node.cloneNode(true);
  if (!(node instanceof Element) || !(clone instanceof Element)) {
    return clone;
  }
  const sourceElements = [node, ...node.querySelectorAll('*')];
  const cloneElements = [clone, ...clone.querySelectorAll('*')];
  let index = 0;
  for (const source of sourceElements) {
    const target = cloneElements[index];
    index += 1;
    if (!(source instanceof ForgeElement) || !(target instanceof ForgeElement)) {
      continue;
    }
    const properties = (source.constructor as typeof ForgeElement).properties;
    for (const name of Object.keys(properties)) {
      (target as unknown as Record<string, unknown>)[name] = (source as unknown as Record<string, unknown>)[name];
    }
  }
  return clone;
}

/** Find the next runtime slot marker in a freshly instantiated fragment. */
function findForgeSlotMarker(root: ParentNode): ForgeSlotMarker | undefined {
  return root.querySelector<ForgeSlotMarker>('[data-mp-forge-slot]') ?? undefined;
}

/**
 * Resolve compiler-emitted runtime slot markers in a render fragment.
 *
 * Markers without a content property become native slots, retaining the
 * browser's fallback and assignment semantics, unless the same slot is
 * repeated in the render tree. Repeated outlets materialize clones of the
 * original light-DOM children so each outlet receives deterministic content.
 * Content markers are lowered to native slots when their value is the owner's
 * original light-DOM children and the outlet is not repeated; otherwise their
 * value is materialized as a last resort.
 */
export function resolveForgeSlotMarkers(
  root: ParentNode,
  owner: ForgeElement,
  sourceChildren: readonly Node[],
  destinationRoot: ShadowRoot,
): void {
  const usedNodes = new Set<Node>();
  let marker = findForgeSlotMarker(root);
  while (marker !== undefined) {
    const name = slotNameOf(marker);
    const fallback = [...marker.childNodes];
    const repeatedOutlet = hasRepeatedSlotOutlet(root, name);
    const nativeSlot = document.createElement('slot');
    if (name !== DEFAULT_SLOT) {
      nativeSlot.name = name;
    }

    if (!hasMarkerContent(marker) && !repeatedOutlet) {
      nativeSlot.replaceChildren(...fallback);
      marker.replaceWith(nativeSlot);
      marker = findForgeSlotMarker(root);
      continue;
    }

    const rawNodes = hasMarkerContent(marker) ? materializeValue(marker.content) : [];
    const selectedSource = childrenForSlot(sourceChildren, name);
    const sourceSet = new Set(sourceChildren);
    const usesOriginalChildren = rawNodes.length > 0 && rawNodes.every((node) => sourceSet.has(node));
    const nodes = hasMarkerContent(marker) && !usesOriginalChildren ? rawNodes : selectedSource;

    if (usesOriginalChildren && selectedSource.length > 0 && !repeatedOutlet) {
      nativeSlot.replaceChildren(...fallback);
      marker.replaceWith(nativeSlot);
      marker = findForgeSlotMarker(root);
      continue;
    }

    if (nodes.length === 0) {
      for (const fallbackNode of fallback) {
        marker.parentNode?.insertBefore(fallbackNode, marker);
      }
      marker.remove();
      marker = findForgeSlotMarker(root);
      continue;
    }

    for (const node of nodes) {
      const sourceOwner = projectionOwners.get(node) ?? owner;
      const output = repeatedOutlet || usedNodes.has(node) ? cloneProjectedNode(node) : node;
      usedNodes.add(node);
      projectionOwners.set(output, sourceOwner);
      if (destinationRoot !== sourceOwner.shadowRoot) {
        const sourceConstructor = sourceOwner.constructor as typeof ForgeElement & ForgeElementConstructor;
        mountStylesIntoRoot(destinationRoot, sourceConstructor.styleUrls ?? []);
      }
      marker.parentNode?.insertBefore(output, marker);
    }
    marker.remove();
    marker = findForgeSlotMarker(root);
  }
}

interface LiveSlotOutlet {
  update(usedNodes: Set<Node>): void;
  setRepeated(repeated: boolean): void;
  name(): string;
  isConnected(): boolean;
  dispose(): void;
}

/**
 * A live compiler slot marker. The marker itself remains detached but is kept
 * as the renderer's attribute target, so dynamic `.name` and `.content`
 * bindings continue to receive updates without rebuilding the surrounding
 * template.
 */
class ForgeSlotOutlet implements LiveSlotOutlet {
  private readonly marker: ForgeSlotMarker;
  private readonly owner: ForgeElement;
  private readonly sourceChildren: readonly Node[];
  private readonly destinationRoot: ShadowRoot;
  private repeated: boolean;
  private readonly fallback: Node[];
  private nativeSlot: HTMLSlotElement | undefined;
  private start: Comment | undefined;
  private end: Comment | undefined;
  private rendered: Node[] = [];
  private renderedTrees: MaterializedTree[] = [];

  constructor(
    marker: ForgeSlotMarker,
    owner: ForgeElement,
    sourceChildren: readonly Node[],
    destinationRoot: ShadowRoot,
    repeated: boolean,
  ) {
    this.marker = marker;
    this.owner = owner;
    this.sourceChildren = sourceChildren;
    this.destinationRoot = destinationRoot;
    this.repeated = repeated;
    this.fallback = [...marker.childNodes];
    this.switchMode(this.shouldUseNative());
  }

  update(usedNodes: Set<Node>): void {
    const useNative = this.shouldUseNative();
    if (useNative !== (this.nativeSlot !== undefined)) {
      this.clearRendered();
      if (useNative) {
        const slot = document.createElement('slot');
        const name = this.currentName();
        if (name !== DEFAULT_SLOT) {
          slot.name = name;
        }
        slot.replaceChildren(...this.fallback);
        this.start?.parentNode?.insertBefore(slot, this.start);
        this.start?.remove();
        this.end?.remove();
        this.start = undefined;
        this.end = undefined;
        this.nativeSlot = slot;
      } else {
        const start = document.createComment('forge-slot-start');
        const end = document.createComment('forge-slot-end');
        this.nativeSlot?.parentNode?.insertBefore(start, this.nativeSlot);
        this.nativeSlot?.parentNode?.insertBefore(end, this.nativeSlot);
        this.nativeSlot?.remove();
        this.nativeSlot = undefined;
        this.start = start;
        this.end = end;
      }
    }
    if (this.nativeSlot !== undefined) {
      this.nativeSlot.name = this.currentName() === DEFAULT_SLOT ? '' : this.currentName();
      return;
    }
    this.updateMaterialized(usedNodes);
  }

  setRepeated(repeated: boolean): void {
    this.repeated = repeated;
  }

  name(): string {
    return this.currentName();
  }

  isConnected(): boolean {
    return this.nativeSlot?.isConnected === true || this.start?.isConnected === true;
  }

  dispose(): void {
    this.clearRendered();
    this.nativeSlot?.remove();
    this.start?.remove();
    this.end?.remove();
    this.nativeSlot = undefined;
    this.start = undefined;
    this.end = undefined;
  }

  private switchMode(useNative: boolean): void {
    if (useNative) {
      const slot = document.createElement('slot');
      const name = this.currentName();
      if (name !== DEFAULT_SLOT) {
        slot.name = name;
      }
      slot.replaceChildren(...this.fallback);
      this.marker.replaceWith(slot);
      this.nativeSlot = slot;
      return;
    }
    const start = document.createComment('forge-slot-start');
    const end = document.createComment('forge-slot-end');
    this.marker.replaceWith(start, end);
    this.start = start;
    this.end = end;
  }

  private shouldUseNative(): boolean {
    if (this.marker.hasAttribute('data-mp-forge-nested')) {
      return false;
    }
    if (!hasMarkerContent(this.marker)) {
      return !this.repeated;
    }
    const selectedSource = childrenForSlot(this.sourceChildren, this.currentName());
    return (
      selectedSource.length > 0 &&
      !this.repeated &&
      containsOnlySourceNodes(this.marker.content, new Set(this.sourceChildren))
    );
  }

  private currentName(): string {
    return slotNameOf(this.marker);
  }

  private updateMaterialized(usedNodes: Set<Node>): void {
    this.clearRendered();
    const contentTree = hasMarkerContent(this.marker) ? materializeTree(this.marker.content) : undefined;
    const rawNodes = contentTree === undefined ? [] : [...contentTree.nodes];
    const selectedSource = childrenForSlot(this.sourceChildren, this.currentName());
    const sourceSet = new Set(this.sourceChildren);
    const usesOriginalChildren = rawNodes.length > 0 && rawNodes.every((node) => sourceSet.has(node));
    const nodes = hasMarkerContent(this.marker) && !usesOriginalChildren ? rawNodes : selectedSource;
    const outputNodes = nodes.length === 0 ? this.fallback : nodes;
    const before = this.end;
    if (before === undefined) {
      return;
    }
    for (const node of outputNodes) {
      const sourceOwner = projectionOwners.get(node) ?? this.owner;
      const output =
        this.repeated || this.marker.hasAttribute('data-mp-forge-nested') || usedNodes.has(node)
          ? cloneProjectedNode(node)
          : node;
      usedNodes.add(node);
      projectionOwners.set(output, sourceOwner);
      if (this.destinationRoot !== sourceOwner.forgeRenderRoot) {
        const sourceConstructor = sourceOwner.constructor as typeof ForgeElement & ForgeElementConstructor;
        mountStylesIntoRoot(this.destinationRoot, sourceConstructor.styleUrls ?? []);
      }
      before.parentNode?.insertBefore(output, before);
      this.rendered.push(output);
      this.renderedTrees.push(
        output === node && contentTree !== undefined ? contentTree : { nodes: [output], dispose: () => undefined },
      );
    }
    if (contentTree !== undefined && this.renderedTrees.every((tree) => tree !== contentTree)) {
      contentTree.dispose();
    }
  }

  private clearRendered(): void {
    const trees = this.renderedTrees;
    this.renderedTrees = [];
    for (const tree of trees) {
      tree.dispose();
    }
    for (const node of this.rendered) {
      if (this.sourceChildren.includes(node) && node.parentNode !== this.owner) {
        this.owner.append(node);
      } else {
        (node as ChildNode).remove();
      }
    }
    this.rendered = [];
  }
}

function containsOnlySourceNodes(value: unknown, sourceNodes: Set<Node>): boolean {
  if (value instanceof Node) {
    return sourceNodes.has(value);
  }
  if (Array.isArray(value)) {
    return value.length > 0 && value.every((item) => containsOnlySourceNodes(item, sourceNodes));
  }
  if (typeof value === 'object' && value !== null && 'length' in value && 'item' in value) {
    const collection = value as unknown as ArrayLike<unknown> & Iterable<unknown>;
    return [...collection].length > 0 && [...collection].every((item) => containsOnlySourceNodes(item, sourceNodes));
  }
  return false;
}

function findLiveForgeSlotMarkers(root: ParentNode): ForgeSlotMarker[] {
  return [...root.querySelectorAll<ForgeSlotMarker>('[data-mp-forge-slot]')];
}

function mountLiveForgeSlotMarkers(
  root: ShadowRoot,
  owner: ForgeElement,
  sourceChildren: readonly Node[],
): LiveSlotOutlet[] {
  const markers = findLiveForgeSlotMarkers(root);
  const names = markers.map((marker) => slotNameOf(marker));
  return markers.map((marker) => {
    const name = slotNameOf(marker);
    const repeated = names.filter((candidate) => candidate === name).length > 1 || hasRepeatedSlotOutlet(root, name);
    return new ForgeSlotOutlet(marker, owner, sourceChildren, root, repeated);
  });
}

/**
 * Render a result into `container` using a persistent template instance. Static
 * DOM and native form state are retained while only changed binding ranges are
 * updated; incompatible template kinds replace the renderer-owned content.
 */
export function render(
  result: TemplateResult | DomTemplateResult | DynamicElementResult | HtmlContentResult,
  container: ParentNode,
): void {
  renderIncrementally(result, container);
}

/**
 * Native `HTMLElement` base class for generated custom elements — a
 * dependency-free stand-in for `LitElement`.
 *
 * A subclass declares its reactive surface via `static properties` (mirroring
 * Lit): each key becomes a prototype accessor whose setter schedules a
 * microtask re-render, and each non-`state` key observes its lower-cased
 * attribute. `render()` returns the element's {@link html}`…` template, rendered
 * into an open shadow root. Reactive commits update the existing template
 * incrementally: positional lists reuse compatible entries, and slot outlets
 * retain their native projection nodes while unrelated parts change.
 */
export class ForgeElement extends ForgeHTMLElement {
  /** Reactive property declarations (overridden by each generated subclass). */
  static readonly properties: Record<string, PropertyDeclaration> = {};
  /** Compiled stylesheet URLs to mount in this element's shadow root. */
  static readonly styleUrls: readonly string[] = [];
  /** Shadow-root policy (overridden by generated classes when configured). */
  static readonly shadow: WebComponentsShadowPolicy = DEFAULT_WEBCOMPONENTS_SHADOW_POLICY;
  /** ElementInternals policy; attachment itself is capability-gated. */
  static readonly internals: WebComponentsInternalsPolicy = DEFAULT_WEBCOMPONENTS_INTERNALS_POLICY;
  /** Form participation is opt-in and never inferred from internals attachment. */
  static readonly formAssociated: boolean = false;
  /** Backing store for reactive property/state values. */
  private mpValues!: Map<string, unknown>;
  /** The element's shadow root, retained even when the public root is closed. */
  private mpRoot: ShadowRoot | undefined;
  /** The host's capability-gated ElementInternals handle. */
  private mpInternals: ElementInternals | undefined;
  /** Incremental template instance for the current render shape. */
  private mpRenderInstance: TemplateInstance | DomTemplateInstance | undefined;
  /** Owned tree for a computed root, disposed before any representation switch. */
  private mpRenderTree: MaterializedTree | undefined;
  /** Live projection outlets associated with the current template instance. */
  private mpSlotOutlets!: LiveSlotOutlet[];
  /** Whether a re-render is already scheduled for the current microtask. */
  private mpDirty = false;
  /** Original light-DOM children used by generated components as their children prop. */
  private mpChildren: readonly Node[] | undefined;
  /** Whether {@link setup} has already run for this element. */
  private mpSetUp = false;
  /** Watches light-DOM projection inputs added after the element connects. */
  private mpChildrenObserver: MutationObserver | undefined;

  constructor() {
    super();
    this.initializeForgeElement();
  }

  /** Initialize host-independent state after the native host has run super(). */
  protected initializeForgeElement(): void {
    this.mpValues = new Map<string, unknown>();
    this.mpSlotOutlets = [];
    this.mpDirty = false;
    this.mpChildren = undefined;
    this.mpSetUp = false;
    this.mpChildrenObserver = undefined;
    this.mpRenderInstance = undefined;
    this.mpRenderTree = undefined;
    this.mpInternals = undefined;
    (this.constructor as typeof ForgeElement).finalize();
    const constructor = this.constructor as typeof ForgeElement & ForgeElementConstructor;
    this.mpRoot = attachShadowWithPolicy(this, constructor.shadow ?? DEFAULT_WEBCOMPONENTS_SHADOW_POLICY);
    const internalsPolicy = constructor.internals ?? DEFAULT_WEBCOMPONENTS_INTERNALS_POLICY;
    if (internalsPolicy.attach && typeof this.attachInternals === 'function') {
      try {
        this.mpInternals = this.attachInternals();
      } catch {
        this.mpInternals = undefined;
      }
    }
    for (const name of Object.keys((this.constructor as typeof ForgeElement).properties)) {
      const descriptor = Object.getOwnPropertyDescriptor(this, name);
      if (descriptor === undefined || !('value' in descriptor)) {
        continue;
      }
      delete (this as unknown as Record<string, unknown>)[name];
      (this as unknown as Record<string, unknown>)[name] = descriptor.value;
    }
  }

  /** The runtime-owned root, including a closed root hidden by `shadowRoot`. */
  get forgeRenderRoot(): ShadowRoot | undefined {
    return this.mpRoot;
  }

  /** Typed access to ElementInternals for generated subclasses and hooks. */
  protected get elementInternals(): ElementInternals | undefined {
    return this.mpInternals;
  }

  /** Preserve the JSX children contract without stringifying the native HTMLCollection. */
  get children(): HTMLCollection {
    return (this.mpChildren ?? nativeChildrenGetter?.call(this) ?? []) as unknown as HTMLCollection;
  }

  /** The observed attributes — the lower-cased names of every non-state property. */
  static get observedAttributes(): string[] {
    this.finalize();
    return Object.entries(this.properties)
      .filter(([, declaration]) => declaration.state !== true)
      .map(([name]) => name.toLowerCase());
  }

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

  connectedCallback(): void {
    if (this.mpChildren === undefined) {
      this.mpChildren = [...this.childNodes];
      rememberProjectionOwner(this.mpChildren, this);
    }
    this.observeChildren();
    this.adoptAttributes();
    this.applyInternalsDefaults();
    this.syncDeclaredFormValue();
    if (!this.mpSetUp) {
      this.mpSetUp = true;
      this.setup();
    }
    this.mountStyles();
    this.renderRoot();
  }

  disconnectedCallback(): void {
    this.mpChildrenObserver?.disconnect();
    this.mpChildrenObserver = undefined;
  }

  /**
   * One-time initialisation, called **after** the host's attributes have been
   * adopted onto their reactive properties and **before** the first render.
   *
   * A no-op here; a generated subclass overrides it when a state cell has to be
   * seeded from a property value (`useState(parseTime(modelValue))`). Such a
   * seed cannot run in the constructor, where every reactive property is still
   * `undefined` — an element is constructed before its attributes exist.
   *
   * It runs exactly **once** per element, not once per connection: a
   * disconnect/reconnect must not re-seed, which would discard whatever the
   * user has since changed.
   */
  setup(): void {
    // Overridden by a generated subclass that has deferred seeds.
  }

  /** Set or clear a custom state when ElementInternals supports custom states. */
  protected setCustomState(name: string, active: boolean): void {
    const states = this.mpInternals?.states;
    if (states === undefined || typeof states.add !== 'function' || typeof states.delete !== 'function') {
      return;
    }
    if (active) {
      states.add(name);
    } else {
      states.delete(name);
    }
  }

  /** Synchronize a form value through ElementInternals when form association is requested. */
  protected setFormValue(value: string | File | FormData | null, state?: string | File | FormData | null): void {
    if (!this.isFormAssociated() || this.mpInternals?.setFormValue === undefined) {
      return;
    }
    this.mpInternals.setFormValue(value, state);
  }

  /** Report form validity without making non-form components participate in forms. */
  protected setValidity(flags: ValidityStateFlags = {}, message = '', anchor?: HTMLElement): void {
    if (!this.isFormAssociated() || this.mpInternals?.setValidity === undefined) {
      return;
    }
    this.mpInternals.setValidity(flags, message, anchor);
  }

  /** Platform callback for form association; subclasses may override it safely. */
  formAssociatedCallback(_form: HTMLFormElement | null): void {
    // Overridden by generated form-associated components when needed.
  }

  /** Platform callback for disabled-state changes. */
  formDisabledCallback(_disabled: boolean): void {
    // Overridden by generated form-associated components when needed.
  }

  /** Restore the declared default value when a form is reset. */
  formResetCallback(): void {
    const formValue = this.formPolicy().formValue;
    if (formValue !== undefined) {
      this.setFormValue(formValue);
    }
    this.requestUpdate();
  }

  /** Platform callback for browser-restored form state. */
  formStateRestoreCallback(_state: string | File | FormData | null, _mode: 'autocomplete' | 'restore'): void {
    // Overridden by generated form-associated components when needed.
  }

  attributeChangedCallback(name: string, _previous: string | null, value: string | null): void {
    const propertyName = this.attributeToProperty(name);
    if (propertyName !== undefined) {
      (this as unknown as Record<string, unknown>)[propertyName] = value;
    }
  }

  /** Schedule an incremental shadow-root update on the next microtask. */
  requestUpdate(): void {
    if (this.mpDirty) {
      return;
    }
    this.mpDirty = true;
    queueMicrotask(() => {
      this.mpDirty = false;
      if (this.isConnected) {
        this.renderRoot();
        this.updatedCallback();
      }
    });
  }

  /** Run generated post-render effects after a reactive update. */
  updatedCallback(): void {
    // Overridden by generated elements whose neutral source uses `useEffect`.
  }

  /** The element's template. Overridden by every generated subclass. */
  render(): TemplateResult | DomTemplateResult | DynamicElementResult {
    return html`
      <slot></slot>
    `;
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

  private internalsPolicy(): WebComponentsInternalsPolicy {
    return (
      (this.constructor as typeof ForgeElement & ForgeElementConstructor).internals ??
      DEFAULT_WEBCOMPONENTS_INTERNALS_POLICY
    );
  }

  private formPolicy(): WebComponentsInternalsPolicy {
    return this.internalsPolicy();
  }

  private isFormAssociated(): boolean {
    const constructor = this.constructor as typeof ForgeElement & ForgeElementConstructor;
    return constructor.formAssociated === true || this.formPolicy().formAssociated === true;
  }

  private syncDeclaredFormValue(): void {
    const formValue = this.formPolicy().formValue;
    if (formValue !== undefined) {
      this.setFormValue(formValue);
    }
  }

  private applyInternalsDefaults(): void {
    const internals = this.mpInternals;
    const aria = this.internalsPolicy().aria;
    if (internals === undefined || aria === undefined) {
      return;
    }
    for (const [name, value] of Object.entries(aria)) {
      const attribute = ariaAttributeName(name);
      if (this.hasAttribute(attribute)) {
        continue;
      }
      const property = internalsPropertyName(name);
      if (property in internals) {
        try {
          (internals as unknown as Record<string, unknown>)[property] = value;
        } catch {
          // A partially implemented ARIA reflection property is optional.
        }
      }
    }
  }

  /** Render the current template into the shadow root. */
  private renderRoot(): void {
    if (this.mpRoot === undefined) {
      return;
    }
    const result = this.render();
    if (result instanceof DynamicElementResult) {
      for (const outlet of this.mpSlotOutlets) {
        outlet.dispose();
      }
      this.mpSlotOutlets = [];
      this.mpRenderInstance?.dispose();
      this.mpRenderInstance = undefined;
      this.mpRenderTree?.dispose();
      this.mpRenderTree = materializeTree(result);
      this.mpRoot.replaceChildren(...this.mpRenderTree.nodes);
      this.mpSlotOutlets = mountLiveForgeSlotMarkers(this.mpRoot, this, this.mpChildren ?? []);
      this.syncLiveSlotOutlets();
      this.assignManualSlots();
      return;
    }
    if (this.mpRenderTree !== undefined) {
      this.mpRenderTree.dispose();
      this.mpRenderTree = undefined;
      this.mpRoot.replaceChildren();
    }
    const incompatible =
      result instanceof DomTemplateResult
        ? !(this.mpRenderInstance instanceof DomTemplateInstance && this.mpRenderInstance.isCompatible(result))
        : !(this.mpRenderInstance instanceof TemplateInstance && this.mpRenderInstance.isCompatible(result));
    if (incompatible) {
      for (const outlet of this.mpSlotOutlets) {
        outlet.dispose();
      }
      this.mpSlotOutlets = [];
      this.mpRenderInstance?.dispose();
      this.mpRenderInstance =
        result instanceof DomTemplateResult ? new DomTemplateInstance(result) : new TemplateInstance(result);
      this.mpRenderInstance.mount(this.mpRoot);
      this.mpSlotOutlets = mountLiveForgeSlotMarkers(this.mpRoot, this, this.mpChildren ?? []);
    } else {
      if (result instanceof DomTemplateResult && this.mpRenderInstance instanceof DomTemplateInstance) {
        this.mpRenderInstance.update(result);
      } else if (result instanceof TemplateResult && this.mpRenderInstance instanceof TemplateInstance) {
        this.mpRenderInstance.update(result);
      }
    }
    this.syncLiveSlotOutlets();
    this.assignManualSlots();
  }

  /** Update existing outlets and discover outlets in newly mounted ranges. */
  private syncLiveSlotOutlets(): void {
    if (this.mpRoot === undefined) {
      return;
    }
    const liveMarkers = new Set(findLiveForgeSlotMarkers(this.mpRoot));
    this.mpSlotOutlets = this.mpSlotOutlets.filter((outlet) => {
      if (outlet.isConnected()) {
        return true;
      }
      outlet.dispose();
      return false;
    });
    if (liveMarkers.size > 0) {
      const newOutlets = mountLiveForgeSlotMarkers(this.mpRoot, this, this.mpChildren ?? []);
      this.mpSlotOutlets.push(...newOutlets);
    }
    const names = new Map<string, number>();
    for (const outlet of this.mpSlotOutlets) {
      names.set(outlet.name(), (names.get(outlet.name()) ?? 0) + 1);
    }
    for (const outlet of this.mpSlotOutlets) {
      outlet.setRepeated((names.get(outlet.name()) ?? 0) > 1);
    }
    const usedNodes = new Set<Node>();
    for (const outlet of this.mpSlotOutlets) {
      outlet.update(usedNodes);
    }
  }

  /** Explicitly distribute native slots when a manual slot policy is requested. */
  private assignManualSlots(): void {
    if (
      this.mpRoot === undefined ||
      (this.constructor as typeof ForgeElement & ForgeElementConstructor).shadow?.slotAssignment !== 'manual'
    ) {
      return;
    }
    for (const slot of this.mpRoot.querySelectorAll<HTMLSlotElement>('slot')) {
      if (typeof slot.assign !== 'function') {
        continue;
      }
      const name = slot.getAttribute('name') ?? DEFAULT_SLOT;
      const assignedNodes = childrenForSlot(this.mpChildren ?? [], name).filter(
        (node): node is Element | Text => node instanceof Element || node instanceof Text,
      );
      slot.assign(...assignedNodes);
    }
  }

  /** Mount each generated stylesheet once, before the current content tree. */
  private mountStyles(): void {
    if (this.mpRoot === undefined || typeof document === 'undefined') {
      return;
    }
    const constructor = this.constructor as typeof ForgeElement & ForgeElementConstructor;
    mountStylesIntoRoot(this.mpRoot, constructor.styleUrls ?? []);
  }

  /** Observe direct light-DOM changes without mistaking projection moves for edits. */
  private observeChildren(): void {
    if (this.mpChildrenObserver !== undefined || typeof MutationObserver === 'undefined') {
      return;
    }
    this.mpChildrenObserver = new MutationObserver((mutations) => {
      const isProjectionNode = (node: Node): boolean =>
        projectionOwners.get(node) === this || node.getRootNode() === this.mpRoot;
      const onlyProjectionMoves = mutations.every(
        (mutation) =>
          [...mutation.addedNodes, ...mutation.removedNodes].length > 0 &&
          [...mutation.addedNodes, ...mutation.removedNodes].every(isProjectionNode),
      );
      if (onlyProjectionMoves) {
        return;
      }
      this.mpChildren = [...this.childNodes];
      rememberProjectionOwner(this.mpChildren, this);
      this.requestUpdate();
    });
    this.mpChildrenObserver.observe(this, { childList: true });
  }
}

/**
 * Add Forge's host-independent runtime to a native element constructor.
 * Customized built-ins cannot extend both `ForgeElement` and `HTMLDivElement`;
 * this mixin copies the behavior while preserving the native prototype chain.
 */
export function ForgeElementMixin<TBase extends ForgeElementHostConstructor>(Base: TBase): TBase & typeof ForgeElement {
  class MixedForgeElement extends Base {
    constructor(...args: any[]) {
      super(...args);
      (this as unknown as { initializeForgeElement: () => void }).initializeForgeElement();
    }
  }

  for (const name of Object.getOwnPropertyNames(ForgeElement.prototype)) {
    if (name === 'constructor') {
      continue;
    }
    const descriptor = Object.getOwnPropertyDescriptor(ForgeElement.prototype, name);
    if (descriptor !== undefined) {
      Object.defineProperty(MixedForgeElement.prototype, name, descriptor);
    }
  }
  for (const name of Object.getOwnPropertyNames(ForgeElement)) {
    if (name === 'length' || name === 'name' || name === 'prototype' || name === 'caller' || name === 'arguments') {
      continue;
    }
    const descriptor = Object.getOwnPropertyDescriptor(ForgeElement, name);
    if (descriptor !== undefined) {
      Object.defineProperty(MixedForgeElement, name, descriptor);
    }
  }

  return MixedForgeElement as TBase & typeof ForgeElement;
}
