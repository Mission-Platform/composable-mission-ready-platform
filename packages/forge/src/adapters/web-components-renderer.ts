/**
 * Internal incremental renderer for the Web-Components adapter.
 *
 * A mounted template retains its static DOM, attribute parts, and child-range
 * anchors; updates commit only changed bindings and ranges. Arrays reconcile
 * positionally (the template protocol has no keyed metadata), while slot
 * outlets remain native nodes so projection and browser-managed state survive
 * unrelated reactive updates.
 */
import { isContextProvider, MP_CONTEXT } from '../runtime/context';

import {
  dynamicElement,
  RawHtml,
  TemplateResult,
  nothing,
  type DomDynamicRenderResult,
  type DomRenderResult,
  type DomTemplateDefinition,
  type DomTemplatePartDefinition,
  type DomTemplateRuntimePart,
  type HtmlContentResult,
} from './web-components';

export type {
  DomTemplateBlueprint,
  DomTemplateDefinition,
  DomTemplatePartDefinition,
  DomTemplateRuntimePart,
} from './web-components';

type BindingPrefix = '' | '?' | '.' | '@' | '~';

type Part =
  | { readonly kind: 'node'; readonly id: number }
  | { readonly kind: 'attr'; readonly id: number; readonly prefix: BindingPrefix; readonly name: string };

interface CompiledTemplate {
  readonly html: string;
  readonly parts: readonly Part[];
}

const templateCache = new WeakMap<TemplateStringsArray, CompiledTemplate>();
const hotTemplateCache = new WeakMap<DomTemplateDefinition, WeakMap<Document, HTMLTemplateElement>>();
const ATTRIBUTE_TAIL = /([.?@~]?)([\w-]+)=$/u;
const PROPERTY_BOUND_NAMES = new Set(['value', 'checked', 'selected', 'disabled']);
const NO_VALUE = Symbol('forge-renderer:no-value');

function hideChildAnchors(children: readonly { hideAnchors(): void }[]): void {
  for (const child of children) {
    child.hideAnchors();
  }
}

/** A compiler-provided slot in a direct-DOM template blueprint. */
export type RuntimePart = DomTemplateRuntimePart;

function isDomTemplateResult(value: unknown): value is Extract<DomRenderResult, { kind: 'template' }> {
  if (typeof value !== 'object' || value === null || (value as { readonly kind?: unknown }).kind !== 'template') {
    return false;
  }
  const result = value as { readonly definition?: unknown; readonly values?: unknown };
  const definition = result.definition as {
    readonly create?: unknown;
    readonly hotTemplate?: unknown;
    readonly parts?: unknown;
  } | null;
  return (
    definition !== null &&
    typeof definition === 'object' &&
    (typeof definition.create === 'function' ||
      (typeof definition.hotTemplate === 'function' && Array.isArray(definition.parts))) &&
    Array.isArray(result.values)
  );
}

function isDomDynamicResult(value: unknown): value is DomDynamicRenderResult {
  if (typeof value !== 'object' || value === null || (value as { readonly kind?: unknown }).kind !== 'dynamic') {
    return false;
  }
  const result = value as { readonly properties?: unknown; readonly children?: unknown };
  return (
    typeof result.properties === 'object' &&
    result.properties !== null &&
    !Array.isArray(result.properties) &&
    Array.isArray(result.children)
  );
}

/** The common ownership boundary for every detached/materialized DOM tree. */
export interface MaterializedTree {
  readonly nodes: readonly Node[];
  dispose(): void;
}

function insertBefore(reference: Node, node: Node): void {
  reference.parentNode?.insertBefore(node, reference);
}

function removeNode(node: Node): void {
  (node as ChildNode).remove();
}

function compileTemplate(strings: TemplateStringsArray): CompiledTemplate {
  const parts: Part[] = [];
  let html = '';
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
    html += segment;
    if (index === strings.length - 1) {
      continue;
    }

    const id = parts.length;
    if (inTag && quote === '') {
      const match = ATTRIBUTE_TAIL.exec(html);
      if (match !== null) {
        const prefix = match[1] as BindingPrefix;
        const name = match[2] ?? '';
        html = `${html.slice(0, -match[0].length)} data-mpbind-${id}`;
        parts.push({ kind: 'attr', id, prefix, name });
        continue;
      }
    }
    html += `<!--mp:${id}-->`;
    parts.push({ kind: 'node', id });
  }

  return { html, parts };
}

function compileCached(strings: TemplateStringsArray): CompiledTemplate {
  const cached = templateCache.get(strings);
  if (cached !== undefined) {
    return cached;
  }
  const compiled = compileTemplate(strings);
  templateCache.set(strings, compiled);
  return compiled;
}

function isEmptyValue(value: unknown): boolean {
  return value === nothing || value === null || value === undefined || value === false || value === true;
}

function normalizeClassValue(value: unknown): string {
  if (value === null || value === undefined || value === false || value === true) {
    return '';
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeClassValue(item))
      .filter(Boolean)
      .join(' ');
  }
  if (typeof value === 'object') {
    return Object.entries(value)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([name]) => name)
      .join(' ');
  }
  return String(value);
}

function normalizeStyleProperty(name: string): string {
  if (name.startsWith('--')) {
    return name;
  }
  const kebab = name.replaceAll(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`);
  return kebab.startsWith('ms-') ? `-${kebab}` : kebab;
}

function normalizeStyleValue(value: unknown): string {
  if (value === null || value === undefined || value === false || value === true) {
    return '';
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    return String(value);
  }
  return Object.entries(value)
    .filter(
      ([, propertyValue]) =>
        propertyValue !== null && propertyValue !== undefined && propertyValue !== false && propertyValue !== true,
    )
    .map(([property, propertyValue]) => `${normalizeStyleProperty(property)}: ${String(propertyValue)}`)
    .join('; ');
}

function normalizedAttributeValue(name: string, value: unknown): string {
  return name === 'class' ? normalizeClassValue(value) : normalizeStyleValue(value);
}

function propertyValue(element: Element, name: string, value: unknown): unknown {
  if (value !== nothing) {
    return value;
  }
  // Native string-valued form properties clear on an empty string. Assigning
  // `undefined` would stringify to "undefined" in browser/DOM implementations.
  return name === 'value' && ['input', 'textarea', 'select', 'option', 'button', 'output'].includes(element.localName)
    ? ''
    : undefined;
}

class AttributePart {
  private previous: unknown = NO_VALUE;
  private listener: EventListener | undefined;
  private eventNames: string[] = [];
  private reference: unknown;
  private readonly element: Element;
  private readonly part: Extract<Part, { kind: 'attr' }>;

  constructor(element: Element, part: Extract<Part, { kind: 'attr' }>) {
    this.element = element;
    this.part = part;
  }

  get id(): number {
    return this.part.id;
  }

  get name(): string {
    return this.part.name;
  }

  update(value?: unknown): void {
    const { prefix, name } = this.part;
    if (name === 'ref') {
      this.updateReference(value);
      return;
    }
    if (prefix === '@') {
      this.updateEvent(value);
      return;
    }
    if (prefix === '?') {
      const enabled = Boolean(value) && value !== nothing;
      if (this.previous !== enabled) {
        this.element.toggleAttribute(name, enabled);
        this.previous = enabled;
      }
      return;
    }

    if (
      prefix === '.' ||
      (prefix === '~' && (this.element.localName.includes('-') || PROPERTY_BOUND_NAMES.has(name)))
    ) {
      if (name === 'class' || name === 'style') {
        this.updateNormalized(name, value);
        return;
      }
      const next = propertyValue(this.element, name, value);
      const current = Reflect.get(this.element, name);
      if (this.previous === next) {
        return;
      }
      if (
        (this.previous !== NO_VALUE || current !== next) &&
        (Reflect.has(this.element, name) || prefix === '.' || this.element.localName.includes('-'))
      ) {
        Reflect.set(this.element, name, next);
      }
      this.previous = next;
      return;
    }

    if (name === 'class' || name === 'style') {
      this.updateNormalized(name, value);
      return;
    }

    const next =
      value === nothing || value === null || value === undefined || value === false
        ? NO_VALUE
        : value === true
          ? ''
          : String(value);
    if (this.previous === next) {
      return;
    }
    if (next === NO_VALUE) {
      if (this.element.hasAttribute(name)) {
        this.element.removeAttribute(name);
      }
    } else if (this.element.getAttribute(name) !== next) {
      this.element.setAttribute(name, next);
    }
    this.previous = next;
  }

  dispose(): void {
    if (this.listener !== undefined) {
      for (const eventName of this.eventNames) {
        this.element.removeEventListener(eventName, this.listener);
      }
      this.listener = undefined;
      this.eventNames = [];
    }
    this.updateReference();
  }

  private updateReference(value?: unknown): void {
    if (this.reference === value) {
      return;
    }
    if (typeof this.reference === 'function') {
      // eslint-disable-next-line unicorn/no-null -- DOM ref callbacks use null to signal detachment.
      this.reference(null);
    } else if (typeof this.reference === 'object' && this.reference !== null && 'current' in this.reference) {
      // eslint-disable-next-line unicorn/no-null -- DOM refs use null to signal detachment.
      (this.reference as { current: Element | null }).current = null;
    }
    this.reference = value;
    if (typeof value === 'function') {
      value(this.element);
    } else if (typeof value === 'object' && value !== null && 'current' in value) {
      (value as { current: Element | null }).current = this.element;
    }
  }

  private updateNormalized(name: string, value: unknown): void {
    const next = normalizedAttributeValue(name, value);
    if (this.previous === next) {
      return;
    }
    if (next.length === 0) {
      this.element.removeAttribute(name);
    } else if (this.element.getAttribute(name) !== next) {
      this.element.setAttribute(name, next);
    }
    this.previous = next;
  }

  private updateEvent(value: unknown): void {
    const callback = typeof value === 'function' ? (value as (value: unknown) => void) : undefined;
    const next =
      callback === undefined
        ? undefined
        : (event: Event) => callback(event instanceof CustomEvent ? event.detail : event);
    if (this.listener === next) {
      return;
    }
    if (this.listener !== undefined) {
      for (const eventName of this.eventNames) {
        this.element.removeEventListener(eventName, this.listener);
      }
    }
    if (next === undefined) {
      this.eventNames = [];
    } else {
      this.eventNames = [
        this.part.name,
        this.part.name.replaceAll(/-([a-z])/gu, (_match, character: string) => character.toUpperCase()),
      ];
      for (const eventName of new Set(this.eventNames)) {
        this.element.addEventListener(eventName, next);
      }
    }
    this.listener = next;
    this.previous = value;
  }
}

class SpreadPart {
  private readonly parts = new Map<string, AttributePart>();
  private readonly element: Element;

  constructor(element: Element) {
    this.element = element;
  }

  update(value: unknown): void {
    const properties = value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};
    for (const [name, part] of this.parts) {
      if (!Object.prototype.hasOwnProperty.call(properties, name)) {
        part.dispose();
        this.parts.delete(name);
      }
    }
    for (const [name, propertyValue] of Object.entries(properties)) {
      let part = this.parts.get(name);
      if (part === undefined) {
        part = new AttributePart(this.element, spreadPropertyPart(name));
        this.parts.set(name, part);
      }
      part.update(propertyValue);
    }
  }

  dispose(): void {
    for (const part of this.parts.values()) part.dispose();
    this.parts.clear();
  }
}

function findMarker(root: Node, id: number): Comment | undefined {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
  const target = `mp:${id}`;
  let current = walker.nextNode();
  while (current !== null) {
    if ((current as Comment).data === target) {
      return current as Comment;
    }
    current = walker.nextNode();
  }
  return undefined;
}

function findAttribute(root: ParentNode, id: number): Element | undefined {
  return root.querySelector(`[data-mpbind-${id}]`) ?? undefined;
}

function spreadPropertyPart(key: string): Extract<Part, { kind: 'attr' }> {
  const prefixed = /^([.?@~])([\w:-]+)$/u.exec(key);
  if (prefixed !== null) {
    return { kind: 'attr', id: -1, prefix: prefixed[1] as BindingPrefix, name: prefixed[2] ?? '' };
  }
  if (/^on[A-Z]/u.test(key)) {
    const eventName = key.slice(2);
    const event = eventName.includes(':')
      ? eventName.charAt(0).toLowerCase() + eventName.slice(1)
      : eventName.charAt(0).toLowerCase() +
        eventName.slice(1).replaceAll(/[A-Z]/gu, (character) => `-${character.toLowerCase()}`);
    return { kind: 'attr', id: -1, prefix: '@', name: event };
  }
  return { kind: 'attr', id: -1, prefix: '~', name: key === 'className' ? 'class' : key === 'htmlFor' ? 'for' : key };
}

function cachedHotTemplate(
  definition: DomTemplateDefinition,
  ownerDocument: Document,
): HTMLTemplateElement | undefined {
  if (definition.hotTemplate === undefined) {
    return undefined;
  }
  let documents = hotTemplateCache.get(definition);
  if (documents === undefined) {
    documents = new WeakMap<Document, HTMLTemplateElement>();
    hotTemplateCache.set(definition, documents);
  }
  const cached = documents.get(ownerDocument);
  if (cached !== undefined) {
    return cached;
  }
  const template = definition.hotTemplate(ownerDocument);
  documents.set(ownerDocument, template);
  return template;
}

class OwnedMaterializedTree implements MaterializedTree {
  private disposed = false;
  readonly nodes: readonly Node[];
  private readonly cleanup: () => void;

  constructor(nodes: readonly Node[], cleanup?: () => void) {
    this.nodes = nodes;
    this.cleanup =
      cleanup ??
      (() => {
        for (const node of nodes) {
          removeNode(node);
        }
      });
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.cleanup();
  }
}

/** Materialize a child value with ownership for all nested listeners and parts. */
export function materializeTree(value: unknown): MaterializedTree {
  if (isEmptyValue(value)) {
    return new OwnedMaterializedTree([]);
  }
  if (value instanceof TemplateResult) {
    const instance = new TemplateInstance(value);
    const nodes = instance.mountDetached();
    instance.hideAnchors();
    return new OwnedMaterializedTree(nodes, () => instance.dispose());
  }
  if (isDomTemplateResult(value)) {
    const instance = new DomTemplateInstance(value);
    const nodes = instance.mountDetached();
    instance.hideAnchors();
    return new OwnedMaterializedTree(nodes, () => instance.dispose());
  }
  if (isDomDynamicResult(value)) {
    const instance = new DomDynamicInstance(value);
    const nodes = instance.mountDetached();
    instance.hideAnchors();
    return new OwnedMaterializedTree(nodes, () => instance.dispose());
  }
  if (isNeutralElement(value)) {
    return materializeTree(dynamicElement(value.type, value.properties, ...value.children));
  }
  if (value instanceof RawHtml) {
    const template = document.createElement('template');
    template.innerHTML = value.value;
    return new OwnedMaterializedTree([...template.content.childNodes]);
  }
  if (Array.isArray(value)) {
    const trees = value.map((item) => materializeTree(item));
    return new OwnedMaterializedTree(
      trees.flatMap((tree) => [...tree.nodes]),
      () => {
        for (const tree of trees) {
          tree.dispose();
        }
      },
    );
  }
  if (typeof value === 'object' && value !== null && 'length' in value && 'item' in value) {
    const collection = value as unknown as ArrayLike<unknown> & Iterable<unknown>;
    return materializeTree([...collection]);
  }
  if (value instanceof Node) {
    return new OwnedMaterializedTree([value], () => {});
  }
  return new OwnedMaterializedTree([document.createTextNode(String(value))]);
}

/** Materialize a child value for dynamic elements and live projection outlets. */
export function materializeValue(value: unknown): Node[] {
  return [...materializeTree(value).nodes];
}

interface NeutralElementValue {
  readonly __mpElement: true;
  readonly type: unknown;
  readonly properties: Readonly<Record<string, unknown>>;
  readonly children: readonly unknown[];
}

function isNeutralElement(value: unknown): value is NeutralElementValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { readonly __mpElement?: unknown }).__mpElement === true &&
    'type' in value &&
    'properties' in value &&
    'children' in value
  );
}

export interface DomRenderInstance {
  mount(container: ParentNode): readonly Node[];
  mountBefore(before: Node): readonly Node[];
  mountDetached(): readonly Node[];
  currentNodes(): readonly Node[];
  update(result: DomRenderResult): void;
  isCompatible(result: DomRenderResult): boolean;
  dispose(): void;
  hideAnchors(): void;
}

type MountedValue =
  | { readonly kind: 'empty'; readonly nodes: readonly Node[] }
  | { readonly kind: 'text'; readonly nodes: readonly [Text]; value: string }
  | { readonly kind: 'node'; readonly nodes: readonly [Node]; value: Node }
  | { readonly kind: 'raw'; readonly nodes: readonly Node[]; value: string }
  | { readonly kind: 'template'; readonly nodes: readonly Node[]; value: TemplateResult; instance: TemplateInstance }
  | {
      readonly kind: 'dom-render';
      readonly nodes: readonly Node[];
      value: DomRenderResult;
      instance: DomRenderInstance;
    }
  | { readonly kind: 'array'; readonly nodes: readonly Node[]; value: readonly unknown[]; entries: MountedValue[] };

function primitiveText(value: unknown): string | undefined {
  if (
    isEmptyValue(value) ||
    value instanceof Node ||
    value instanceof TemplateResult ||
    isDomTemplateResult(value) ||
    value instanceof RawHtml ||
    isDomDynamicResult(value) ||
    Array.isArray(value)
  ) {
    return undefined;
  }
  if (typeof value === 'object' && value !== null && 'length' in value && 'item' in value) {
    return undefined;
  }
  return String(value);
}

class NodePart {
  private current: MountedValue = { kind: 'empty', nodes: [] };
  private readonly start: Comment;
  private readonly end: Comment;

  constructor(start: Comment, end: Comment) {
    this.start = start;
    this.end = end;
  }

  update(value: unknown): void {
    this.current = this.reconcile(this.current, value);
  }

  dispose(): void {
    this.disposeValue(this.current);
    this.current = { kind: 'empty', nodes: [] };
    removeNode(this.start);
    removeNode(this.end);
  }

  get nodes(): readonly Node[] {
    return this.current.nodes;
  }

  hideAnchors(): void {
    removeNode(this.start);
    removeNode(this.end);
  }

  private reconcile(oldValue: MountedValue, value: unknown): MountedValue {
    if (Array.isArray(value)) {
      if (oldValue.kind === 'array') {
        return this.reconcileArray(oldValue, value);
      }
      this.disposeValue(oldValue);
      return this.createArray(value);
    }
    const text = primitiveText(value);
    if (text !== undefined) {
      if (oldValue.kind === 'text') {
        if (oldValue.value !== text) {
          oldValue.nodes[0].data = text;
        }
        return { ...oldValue, value: text };
      }
      this.disposeValue(oldValue);
      const node = document.createTextNode(text);
      insertBefore(this.end, node);
      return { kind: 'text', nodes: [node], value: text };
    }
    if (value instanceof TemplateResult) {
      if (oldValue.kind === 'template' && oldValue.value.strings === value.strings) {
        oldValue.instance.update(value);
        return { ...oldValue, value };
      }
      this.disposeValue(oldValue);
      const instance = new TemplateInstance(value);
      const nodes = instance.mountBefore(this.end);
      return { kind: 'template', nodes, value, instance };
    }
    if (isDomTemplateResult(value) || isDomDynamicResult(value)) {
      if (oldValue.kind === 'dom-render' && oldValue.instance.isCompatible(value)) {
        oldValue.instance.update(value);
        return { ...oldValue, nodes: [...oldValue.instance.currentNodes()], value };
      }
      this.disposeValue(oldValue);
      const instance = value.kind === 'template' ? new DomTemplateInstance(value) : new DomDynamicInstance(value);
      instance.mountBefore(this.end);
      const nodes = [...instance.currentNodes()];
      return { kind: 'dom-render', nodes, value, instance };
    }
    if (value instanceof RawHtml) {
      if (oldValue.kind === 'raw' && oldValue.value === value.value) {
        return oldValue;
      }
      this.disposeValue(oldValue);
      const nodes = materializeValue(value);
      this.insertNodes(nodes);
      return { kind: 'raw', nodes, value: value.value };
    }
    if (value instanceof Node) {
      if (oldValue.kind === 'node' && oldValue.value === value) {
        return oldValue;
      }
      this.disposeValue(oldValue);
      this.insertNodes([value]);
      return { kind: 'node', nodes: [value], value };
    }
    this.disposeValue(oldValue);
    return { kind: 'empty', nodes: [] };
  }

  private createArray(values: readonly unknown[]): MountedValue {
    const entries: MountedValue[] = [];
    for (const value of values) {
      const entry = this.createEmptyEntry(value);
      entries.push(entry);
    }
    return { kind: 'array', nodes: entries.flatMap((entry) => [...entry.nodes]), value: values, entries };
  }

  private createEmptyEntry(value: unknown): MountedValue {
    const temporary = new NodePart(this.start, this.end);
    return temporary.reconcile({ kind: 'empty', nodes: [] }, value);
  }

  private reconcileArray(oldValue: Extract<MountedValue, { kind: 'array' }>, values: readonly unknown[]): MountedValue {
    const entries = oldValue.entries.slice(0, values.length);
    for (const [index, nextValue] of values.entries()) {
      const oldEntry = oldValue.entries[index];
      if (oldEntry === undefined) {
        entries[index] = this.createEmptyEntry(nextValue);
        continue;
      }
      if (this.canUpdate(oldEntry, nextValue)) {
        entries[index] = this.reconcile(oldEntry, nextValue);
      } else {
        this.disposeValue(oldEntry);
        entries[index] = this.createEmptyEntry(nextValue);
      }
    }
    for (let index = oldValue.entries.length - 1; index >= values.length; index -= 1) {
      const oldEntry = oldValue.entries[index];
      if (oldEntry !== undefined) {
        this.disposeValue(oldEntry);
      }
    }
    for (const entry of entries) {
      for (const node of entry.nodes) {
        insertBefore(this.end, node);
      }
    }
    return { kind: 'array', nodes: entries.flatMap((entry) => [...entry.nodes]), value: values, entries };
  }

  private canUpdate(oldValue: MountedValue, value: unknown): boolean {
    if (Array.isArray(value)) {
      return oldValue.kind === 'array';
    }
    if (primitiveText(value) !== undefined) {
      return oldValue.kind === 'text';
    }
    if (value instanceof TemplateResult) {
      return oldValue.kind === 'template' && oldValue.value.strings === value.strings;
    }
    if (isDomTemplateResult(value)) {
      return oldValue.kind === 'dom-render' && oldValue.instance.isCompatible(value);
    }
    if (value instanceof RawHtml) {
      return oldValue.kind === 'raw';
    }
    if (value instanceof Node) {
      return oldValue.kind === 'node' && oldValue.value === value;
    }
    if (isDomDynamicResult(value)) {
      return oldValue.kind === 'dom-render' && oldValue.instance.isCompatible(value);
    }
    return false;
  }

  private insertNodes(nodes: readonly Node[], before: Node = this.end): void {
    const parent = before.parentNode;
    if (parent !== null) {
      for (const node of nodes) {
        insertBefore(before, node);
      }
    }
  }

  private disposeValue(value: MountedValue): void {
    switch (value.kind) {
      case 'template': {
        value.instance.dispose();

        break;
      }
      case 'dom-render': {
        value.instance.dispose();

        break;
      }
      case 'array': {
        for (const entry of value.entries) {
          this.disposeValue(entry);
        }

        break;
      }
      // No default
    }
    for (const node of value.nodes) {
      removeNode(node);
    }
  }
}

/** Incremental instance for dynamic intrinsic tags, components, and providers. */
export class DomDynamicInstance implements DomRenderInstance {
  private readonly attributes = new Map<string, AttributePart>();
  private readonly result: DomDynamicRenderResult;
  private element: Element | undefined;
  private children: NodePart | undefined;
  private start: Comment | undefined;
  private end: Comment | undefined;
  private rootNodes: Node[] = [];
  private mounted = false;

  constructor(result: DomDynamicRenderResult) {
    this.result = result;
  }

  currentNodes(): readonly Node[] {
    if (this.start !== undefined && this.end !== undefined) {
      return [this.start, ...this.rootNodes, this.end];
    }
    return this.rootNodes;
  }

  mount(container: ParentNode): readonly Node[] {
    if (this.mounted) {
      return this.rootNodes;
    }
    this.initialize();
    if (this.element !== undefined) {
      this.update(this.result);
      container.append(this.element);
    } else if (this.start !== undefined && this.end !== undefined) {
      container.append(this.start, this.end);
      this.update(this.result);
    }
    this.mounted = true;
    return this.rootNodes;
  }

  mountBefore(before: Node): readonly Node[] {
    if (before.parentNode === null) {
      return [];
    }
    this.initialize();
    if (this.element !== undefined) {
      this.update(this.result);
      insertBefore(before, this.element);
    } else if (this.start !== undefined && this.end !== undefined) {
      insertBefore(before, this.start);
      insertBefore(before, this.end);
      this.update(this.result);
    }
    this.mounted = true;
    return this.rootNodes;
  }

  mountDetached(): readonly Node[] {
    this.initialize();
    const fragment = document.createDocumentFragment();
    if (this.element !== undefined) {
      fragment.append(this.element);
    } else if (this.start !== undefined && this.end !== undefined) {
      fragment.append(this.start, this.end);
    }
    this.update(this.result);
    this.mounted = true;
    return this.rootNodes;
  }

  update(result: DomRenderResult): void {
    if (!isDomDynamicResult(result) || !this.isCompatible(result)) {
      throw new TypeError('A DomDynamicInstance can only update a compatible dynamic result.');
    }
    if (this.element === undefined) {
      this.updateRange(result);
    } else {
      this.updateElement(result);
    }
  }

  isCompatible(result: DomRenderResult): boolean {
    return (
      isDomDynamicResult(result) &&
      result.tag === this.result.tag &&
      customizedBuiltIn(this.result) === customizedBuiltIn(result)
    );
  }

  dispose(): void {
    for (const attribute of this.attributes.values()) {
      attribute.dispose();
    }
    this.attributes.clear();
    this.children?.dispose();
    this.children = undefined;
    if (this.start !== undefined) {
      removeNode(this.start);
    }
    if (this.end !== undefined) {
      removeNode(this.end);
    }
    if (this.element !== undefined) {
      removeNode(this.element);
    }
    this.rootNodes = [];
    this.mounted = false;
  }

  hideAnchors(): void {
    this.children?.hideAnchors();
    if (this.start !== undefined) {
      removeNode(this.start);
    }
    if (this.end !== undefined) {
      removeNode(this.end);
    }
  }

  private initialize(): void {
    if (this.element !== undefined || this.start !== undefined) {
      return;
    }
    if (typeof this.result.tag === 'string') {
      if (this.result.tag.length === 0) {
        throw new TypeError('Dynamic Web Components tags must resolve to a non-empty string.');
      }
      const customized = customizedBuiltIn(this.result);
      this.element =
        typeof customized === 'string'
          ? document.createElement(this.result.tag, { is: customized })
          : document.createElement(this.result.tag);
      const start = document.createComment('mp:dynamic-start');
      const end = document.createComment('/mp:dynamic-end');
      this.children = new NodePart(start, end);
      this.element.append(start, end);
      this.rootNodes = [this.element];
      return;
    }
    if (!isContextProvider(this.result.tag) && typeof this.result.tag !== 'function') {
      throw new TypeError('Dynamic Web Components tags must resolve to a tag name or component.');
    }
    this.start = document.createComment('mp:dynamic-start');
    this.end = document.createComment('/mp:dynamic-end');
    this.children = new NodePart(this.start, this.end);
  }

  private updateElement(result: DomDynamicRenderResult): void {
    const element = this.element;
    const children = this.children;
    if (element === undefined || children === undefined) {
      return;
    }
    for (const [name, part] of this.attributes) {
      if (!Object.prototype.hasOwnProperty.call(result.properties, name)) {
        part.update();
        part.dispose();
        this.attributes.delete(name);
      }
    }
    for (const [name, value] of Object.entries(result.properties)) {
      let part = this.attributes.get(name);
      if (part === undefined) {
        part = new AttributePart(element, spreadPropertyPart(name));
        this.attributes.set(name, part);
      }
      part.update(value);
    }
    children.update(result.children);
    this.rootNodes = [element];
  }

  private updateRange(result: DomDynamicRenderResult): void {
    const children = this.children;
    if (children === undefined) {
      return;
    }
    if (isContextProvider(result.tag)) {
      const context = result.tag[MP_CONTEXT];
      context.stack.push(result.properties['~value'] ?? result.properties.value);
      try {
        children.update(result.children);
      } finally {
        context.stack.pop();
      }
    } else if (typeof result.tag === 'function') {
      const properties: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(result.properties)) {
        const prefix = key[0];
        const name = prefix === '?' || prefix === '.' || prefix === '~' || prefix === '@' ? key.slice(1) : key;
        const componentName = prefix === '@' ? `on${name[0]?.toUpperCase() ?? ''}${name.slice(1)}` : name;
        properties[componentName] = value;
      }
      properties.children = result.children.length === 1 ? result.children[0] : result.children;
      children.update(result.tag(properties));
    }
    this.rootNodes = [...children.nodes];
  }
}

function customizedBuiltIn(result: DomDynamicRenderResult): unknown {
  return result.properties.is ?? result.properties['~is'];
}

export class TemplateInstance {
  private readonly compiled: CompiledTemplate;
  private readonly attributes: AttributePart[] = [];
  private readonly children: NodePart[] = [];
  private rootNodes: Node[] = [];
  private mounted = false;
  private result: TemplateResult;

  constructor(result: TemplateResult) {
    this.result = result;
    this.compiled = compileCached(result.strings);
  }

  mount(container: ParentNode): readonly Node[] {
    if (this.mounted) {
      return this.rootNodes;
    }
    const template = document.createElement('template');
    template.innerHTML = this.compiled.html;
    this.rootNodes = [...template.content.childNodes];
    this.prepare(template.content);
    this.update(this.result);
    container.append(template.content);
    this.mounted = true;
    return this.rootNodes;
  }

  mountBefore(before: Node): readonly Node[] {
    const parent = before.parentNode;
    if (parent === null) {
      return [];
    }
    const template = document.createElement('template');
    template.innerHTML = this.compiled.html;
    this.rootNodes = [...template.content.childNodes];
    this.prepare(template.content);
    this.update(this.result);
    insertBefore(before, template.content);
    this.mounted = true;
    return this.rootNodes;
  }

  mountDetached(): Node[] {
    const template = document.createElement('template');
    template.innerHTML = this.compiled.html;
    this.rootNodes = [...template.content.childNodes];
    this.prepare(template.content);
    this.update(this.result);
    this.mounted = true;
    return this.rootNodes;
  }

  update(result: TemplateResult): void {
    if (result.strings !== this.result.strings) {
      throw new TypeError('A TemplateInstance can only update a compatible template.');
    }
    this.result = result;
    for (const part of this.attributes) {
      part.update(result.values[part.id]);
    }
    for (let index = 0; index < this.children.length; index += 1) {
      this.children[index]?.update(
        result.values[this.compiled.parts.filter((part) => part.kind === 'node')[index]?.id ?? -1],
      );
    }
  }

  isCompatible(result: TemplateResult): boolean {
    return result.strings === this.result.strings;
  }

  dispose(): void {
    for (const attribute of this.attributes) {
      attribute.dispose();
    }
    for (const child of this.children) {
      child.dispose();
    }
    for (const node of this.rootNodes) {
      removeNode(node);
    }
    this.rootNodes = [];
    this.mounted = false;
  }

  hideAnchors(): void {
    hideChildAnchors(this.children);
  }

  private prepare(root: DocumentFragment): void {
    for (const part of this.compiled.parts) {
      if (part.kind === 'attr') {
        const element = findAttribute(root, part.id);
        if (element !== undefined) {
          element.removeAttribute(`data-mpbind-${part.id}`);
          this.attributes.push(new AttributePart(element, part));
        }
        continue;
      }
      const marker = findMarker(root, part.id);
      if (marker !== undefined) {
        const end = document.createComment(`/mp:${part.id}`);
        marker.parentNode?.insertBefore(end, marker.nextSibling);
        this.children.push(new NodePart(marker, end));
      }
    }
  }
}

function nodeAtPath(root: Node, path: readonly number[]): Node | undefined {
  let current: Node | undefined = root;
  for (const index of path) {
    current = current?.childNodes[index];
  }
  return current;
}

function runtimePartsFromDefinitions(
  root: DocumentFragment,
  definitions: readonly DomTemplatePartDefinition[],
): RuntimePart[] {
  const parts: RuntimePart[] = [];
  for (const definition of definitions) {
    const node = nodeAtPath(root, definition.path);
    if (definition.kind === 'attr') {
      if (!(node instanceof Element)) {
        continue;
      }
      parts.push({ ...definition, element: node });
      continue;
    }
    if (definition.kind === 'spread') {
      if (node instanceof Element) {
        parts.push({ ...definition, element: node });
      }
      continue;
    }
    if (!(node instanceof Comment)) {
      continue;
    }
    parts.push({ ...definition, start: node });
  }
  return parts;
}

/** Incremental instance for compiler-generated direct-DOM template results. */
export class DomTemplateInstance implements DomRenderInstance {
  private readonly attributes: AttributePart[] = [];
  private readonly spreads: SpreadPart[] = [];
  private readonly spreadIds = new Map<SpreadPart, number>();
  private readonly children: NodePart[] = [];
  private rootNodes: Node[] = [];
  private mounted = false;
  private result: Extract<DomRenderResult, { kind: 'template' }>;
  private childIds: number[] = [];

  constructor(result: Extract<DomRenderResult, { kind: 'template' }>) {
    this.result = result;
  }

  currentNodes(): readonly Node[] {
    return this.rootNodes;
  }

  mount(container: ParentNode): readonly Node[] {
    if (this.mounted) {
      return this.rootNodes;
    }
    const fragment = this.instantiate();
    this.rootNodes = [...fragment.childNodes];
    this.update(this.result);
    container.append(fragment);
    this.mounted = true;
    return this.rootNodes;
  }

  mountBefore(before: Node): readonly Node[] {
    const parent = before.parentNode;
    if (parent === null) {
      return [];
    }
    const fragment = this.instantiate();
    this.rootNodes = [...fragment.childNodes];
    this.update(this.result);
    insertBefore(before, fragment);
    this.mounted = true;
    return this.rootNodes;
  }

  mountDetached(): Node[] {
    const fragment = this.instantiate();
    this.rootNodes = [...fragment.childNodes];
    this.update(this.result);
    this.mounted = true;
    return this.rootNodes;
  }

  update(result: DomRenderResult): void {
    if (!isDomTemplateResult(result) || result.definition !== this.result.definition) {
      throw new TypeError('A DomTemplateInstance can only update a compatible definition.');
    }
    this.result = result;
    for (const attribute of this.attributes) {
      attribute.update(result.values[attribute.id]);
    }
    for (const spread of this.spreads) {
      spread.update(result.values[this.spreadIds.get(spread) ?? -1]);
    }
    for (let index = 0; index < this.children.length; index += 1) {
      this.children[index]?.update(result.values[this.childIds[index] ?? -1]);
    }
  }

  isCompatible(result: DomRenderResult): boolean {
    return isDomTemplateResult(result) && result.definition === this.result.definition;
  }

  dispose(): void {
    for (const attribute of this.attributes) {
      attribute.dispose();
    }
    for (const spread of this.spreads) {
      spread.dispose();
    }
    for (const child of this.children) {
      child.dispose();
    }
    for (const node of this.rootNodes) {
      removeNode(node);
    }
    this.rootNodes = [];
    this.mounted = false;
  }

  hideAnchors(): void {
    hideChildAnchors(this.children);
  }

  private instantiate(): DocumentFragment {
    const definition = this.result.definition;
    let fragment: DocumentFragment;
    let parts: readonly RuntimePart[];
    const hotTemplate = cachedHotTemplate(definition, document);
    if (hotTemplate !== undefined && definition.parts !== undefined) {
      fragment = hotTemplate.content.cloneNode(true) as DocumentFragment;
      parts = runtimePartsFromDefinitions(fragment, definition.parts);
    } else {
      if (definition.create === undefined) {
        throw new TypeError('A direct-DOM template definition must provide a create function.');
      }
      const blueprint = definition.create(document);
      fragment = document.createDocumentFragment();
      fragment.append(...blueprint.nodes);
      parts = blueprint.parts;
    }
    this.prepare(parts);
    return fragment;
  }

  private prepare(parts: readonly RuntimePart[]): void {
    this.attributes.length = 0;
    this.spreads.length = 0;
    this.spreadIds.clear();
    this.children.length = 0;
    this.childIds = [];
    for (const part of parts) {
      if (part.kind === 'attr') {
        this.attributes.push(new AttributePart(part.element, part));
        continue;
      }
      if (part.kind === 'spread') {
        const spread = new SpreadPart(part.element);
        this.spreads.push(spread);
        this.spreadIds.set(spread, part.id);
        continue;
      }
      const end = part.end ?? document.createComment(`/mp:${part.id}`);
      if (part.end === undefined) {
        part.start.parentNode?.insertBefore(end, part.start.nextSibling);
      }
      this.children.push(new NodePart(part.start, end));
      this.childIds.push(part.id);
    }
  }
}

class HtmlContentInstance {
  private element: Element | undefined;
  private content = '';
  private parts = new Map<string, AttributePart>();
  private result: HtmlContentResult;

  constructor(result: HtmlContentResult) {
    this.result = result;
  }

  isCompatible(result: HtmlContentResult): boolean {
    return this.element?.localName === (result.properties.as ?? 'div').toLowerCase();
  }

  mount(container: ParentNode): void {
    this.element = document.createElement(this.result.properties.as ?? 'div');
    container.append(this.element);
    this.update(this.result);
  }

  update(result: HtmlContentResult): void {
    if (this.element === undefined) {
      return;
    }
    this.result = result;
    const properties = result.properties;
    if (this.content !== properties.html) {
      this.element.innerHTML = properties.html;
      this.content = properties.html;
    }
    const activeNames = new Set<string>();
    for (const [name, part] of this.parts) {
      if (name === 'ref' || name === 'html' || name === 'as' || name === 'children') {
        continue;
      }
      if (!Object.prototype.hasOwnProperty.call(properties, name)) {
        part.dispose();
        this.parts.delete(name);
      }
    }
    for (const [name, value] of Object.entries(properties)) {
      if (name === 'html' || name === 'as' || name === 'children') {
        continue;
      }
      activeNames.add(name);
      let part = this.parts.get(name);
      if (part === undefined) {
        const descriptor =
          name === 'ref' ? { kind: 'attr' as const, id: -1, prefix: '' as const, name } : spreadPropertyPart(name);
        part = new AttributePart(this.element, descriptor);
        this.parts.set(name, part);
      }
      part.update(value);
    }
    const reference = this.parts.get('ref');
    if (reference !== undefined && !activeNames.has('ref')) {
      reference.update();
    }
  }

  dispose(): void {
    for (const part of this.parts.values()) {
      part.dispose();
    }
    this.parts.clear();
    this.element?.remove();
    this.element = undefined;
  }
}

type RenderInstance = TemplateInstance | DomRenderInstance | HtmlContentInstance;
const renderInstances = new WeakMap<ParentNode, RenderInstance>();

function isDomRenderInstance(instance: RenderInstance | undefined): instance is DomRenderInstance {
  return instance instanceof DomTemplateInstance || instance instanceof DomDynamicInstance;
}

export function renderIncrementally(
  result: TemplateResult | DomRenderResult | HtmlContentResult,
  container: ParentNode,
): void {
  const current = renderInstances.get(container);
  if (result instanceof TemplateResult) {
    if (current instanceof TemplateInstance && current.isCompatible(result)) {
      current.update(result);
      return;
    }
    current?.dispose();
    container.replaceChildren();
    const instance = new TemplateInstance(result);
    instance.mount(container);
    renderInstances.set(container, instance);
    return;
  }
  if (isDomTemplateResult(result) || isDomDynamicResult(result)) {
    if (isDomRenderInstance(current) && current.isCompatible(result)) {
      current.update(result);
      return;
    }
    current?.dispose();
    container.replaceChildren();
    const instance = result.kind === 'template' ? new DomTemplateInstance(result) : new DomDynamicInstance(result);
    instance.mount(container);
    renderInstances.set(container, instance);
    return;
  }
  if (current instanceof HtmlContentInstance && current.isCompatible(result)) {
    current.update(result);
    return;
  }
  current?.dispose();
  container.replaceChildren();
  const instance = new HtmlContentInstance(result);
  instance.mount(container);
  renderInstances.set(container, instance);
}

export function disposeRendered(container: ParentNode): void {
  const instance = renderInstances.get(container);
  if (instance !== undefined) {
    instance.dispose();
    renderInstances.delete(container);
  }
}
