// @vitest-environment jsdom
import { useContext, type MpContext } from '@mission-platform/forge-jsx/runtime';

import { dynamicElement, ForgeElement, html, nothing } from './web-components';

import type { DomRenderResult, DomTemplateDefinition, TemplateResult } from './web-components';

export type DynamicShape = 'div' | 'span';

export function dynamicShapeComponent(properties: { readonly shape: DynamicShape }): DomRenderResult {
  return dynamicElement(properties.shape, {}, properties.shape);
}

function contextReader<T>(context: MpContext<T>): () => TemplateResult {
  return (): TemplateResult => html`
    <span>${useContext(context)}</span>
  `;
}

function conditionalRangeView(visible: boolean): TemplateResult {
  return html`
    <section>
      ${
        visible
          ? html`
              <span class="visible">shown</span>
            `
          : nothing
      }
    </section>
  `;
}

function directDefinition(): DomTemplateDefinition {
  return {
    create: (ownerDocument) => {
      const section = ownerDocument.createElement('section');
      const marker = ownerDocument.createComment('slot');
      section.append(marker);
      return {
        nodes: [section],
        parts: [{ kind: 'node', id: 0, start: marker }],
      };
    },
  };
}

/**
 * A representative generated-style element: a reactive `state` count, an
 * observed `label` property/attribute, an event binding, a conditional
 * (`nothing`) hole and a `.map()` list — the full template dialect the
 * Web-Components generator emits.
 */
class CounterElement extends ForgeElement {
  static readonly properties = { label: {}, count: { state: true } };

  declare label?: string;
  declare count: number;

  constructor() {
    super();
    this.count = 0;
  }

  render(): TemplateResult {
    return html`
      <div class="counter">
        <span class="label">${this.label}</span>
        <button
          @click=${() => {
            this.count = this.count + 1;
          }}
        >
          +
        </button>
        <span class="value">${this.count}</span>
        ${
          this.count > 0
            ? html`
                <em class="positive">positive</em>
              `
            : nothing
        }
        <ul>
          ${[1, 2, 3].map(
            (n) => html`
              <li>${n}</li>
            `,
          )}
        </ul>
      </div>
    `;
  }
}

class PreUpgradeElement extends ForgeElement {
  static readonly properties = { open: {} };

  declare open: boolean;

  render(): TemplateResult {
    return html`
      <section>
        ${
          this.open
            ? html`
                <span class="visible">shown</span>
              `
            : nothing
        }
      </section>
    `;
  }
}

class UpdatedCallbackElement extends ForgeElement {
  static readonly properties = { value: {} };

  declare value: string;
  updates = 0;

  updatedCallback(): void {
    this.updates += 1;
  }

  render(): TemplateResult {
    return html`
      <span>${this.value}</span>
    `;
  }
}

class DynamicRootElement extends ForgeElement {
  static readonly properties = { tag: { state: true }, value: { state: true } };

  declare tag: 'button' | 'span';
  declare value: string;
  readonly clicks: string[] = [];

  constructor() {
    super();
    this.tag = 'button';
    this.value = 'first';
  }

  render(): DomRenderResult {
    return dynamicElement(this.tag, { '~value': this.value, '@click': () => this.clicks.push(this.value) }, this.value);
  }
}

class StyledElement extends ForgeElement {
  static readonly properties = { count: { state: true } };
  static readonly styleUrls = ['/styles/own.css', '/styles/shared.css', '/styles/own.css'];

  declare count: number;

  constructor() {
    super();
    this.count = 0;
  }

  render(): TemplateResult {
    return html`
      <span class="count">${this.count}</span>
    `;
  }
}

class NormalizedValuesElement extends ForgeElement {
  static readonly properties = { active: { state: true } };

  declare active: boolean;

  constructor() {
    super();
    this.active = true;
  }

  render(): TemplateResult {
    return html`
      <div
        class=${['base', ['nested', { active: this.active, disabled: false }]]}
        style=${{ backgroundColor: 'red', fontSize: '12px', '--gap': '2px' }}
      >
        ${
          this.active
            ? html`
                <span>visible</span>
              `
            : nothing
        }
      </div>
    `;
  }
}

class ChildrenElement extends ForgeElement {
  static readonly properties = { version: { state: true } };

  declare version: number;

  constructor() {
    super();
    this.version = 0;
  }

  render(): TemplateResult {
    return html`
      <section>
        ${this.children}
        <span>${this.version}</span>
      </section>
    `;
  }
}

class DynamicSlotElement extends ForgeElement {
  static readonly properties = {
    enabled: { state: true },
    slotName: { state: true },
  };

  declare enabled: boolean;
  declare slotName: string;

  constructor() {
    super();
    this.enabled = true;
    this.slotName = 'default';
  }

  render(): TemplateResult {
    return html`
      <section class="projection">
        <forge-slot
          data-mp-forge-slot="default"
          .name=${this.slotName}
          .content=${this.enabled ? this.children : undefined}
        ></forge-slot>
      </section>
    `;
  }
}

class StyledProjectionElement extends ForgeElement {
  static readonly styleUrls = ['/styles/projection-owner.css'];

  render(): TemplateResult {
    return html`
      <forge-slot
        data-mp-forge-slot="default"
        .content=${this.children}
      ></forge-slot>
    `;
  }
}

class MaterializingSlotElement extends ForgeElement {
  render(): TemplateResult {
    return html`
      <div class="materialized-outlets">
        <forge-slot
          data-mp-forge-slot="default"
          .content=${[
            this.children,
            html`
              <i class="extra">extra</i>
            `,
          ]}
        ></forge-slot>
        <forge-slot
          data-mp-forge-slot="default"
          .content=${[
            this.children,
            html`
              <i class="extra">extra</i>
            `,
          ]}
        ></forge-slot>
      </div>
    `;
  }
}

class StyledMaterializingOwnerElement extends ForgeElement {
  static readonly styleUrls = ['/styles/materialized-owner.css'];

  render(): TemplateResult {
    return html`
      <mp-materializing-slot-test>${this.children}</mp-materializing-slot-test>
    `;
  }
}

class FallbackSlotElement extends ForgeElement {
  render(): TemplateResult {
    return html`
      <forge-slot data-mp-forge-slot="true">fallback</forge-slot>
    `;
  }
}

/** A generated-style controlled text input that echoes its native input value. */
class ControlledInputElement extends ForgeElement {
  static readonly properties = { modelValue: { state: true } };

  declare modelValue: unknown;

  constructor() {
    super();
    this.modelValue = 'initial';
  }

  render(): TemplateResult {
    return html`
      <input
        class="control"
        .value=${this.modelValue}
        @input=${(event: Event) => {
          this.modelValue = (event.currentTarget as HTMLInputElement).value;
        }}
      />
      <output>${this.modelValue}</output>
    `;
  }
}

/** A generated-style controlled textarea with the same model-echo contract. */
class ControlledTextareaElement extends ForgeElement {
  static readonly properties = { modelValue: { state: true } };

  declare modelValue: string;

  constructor() {
    super();
    this.modelValue = 'initial text';
  }

  render(): TemplateResult {
    return html`
      <textarea
        class="control"
        .value=${this.modelValue}
        @input=${(event: Event) => {
          this.modelValue = (event.currentTarget as HTMLTextAreaElement).value;
        }}
      ></textarea>
      <output>${this.modelValue}</output>
    `;
  }
}

if (!customElements.get('mp-counter-test')) {
  customElements.define('mp-counter-test', CounterElement);
}
if (!customElements.get('mp-updated-callback-test')) {
  customElements.define('mp-updated-callback-test', UpdatedCallbackElement);
}
if (!customElements.get('mp-styled-test')) {
  customElements.define('mp-styled-test', StyledElement);
}
if (!customElements.get('mp-normalized-values-test')) {
  customElements.define('mp-normalized-values-test', NormalizedValuesElement);
}
if (!customElements.get('mp-children-test')) {
  customElements.define('mp-children-test', ChildrenElement);
}
if (!customElements.get('mp-dynamic-slot-test')) {
  customElements.define('mp-dynamic-slot-test', DynamicSlotElement);
}
if (!customElements.get('mp-styled-projection-test')) {
  customElements.define('mp-styled-projection-test', StyledProjectionElement);
}
if (!customElements.get('mp-materializing-slot-test')) {
  customElements.define('mp-materializing-slot-test', MaterializingSlotElement);
}
if (!customElements.get('mp-styled-materializing-owner-test')) {
  customElements.define('mp-styled-materializing-owner-test', StyledMaterializingOwnerElement);
}
if (!customElements.get('mp-fallback-slot-test')) {
  customElements.define('mp-fallback-slot-test', FallbackSlotElement);
}
if (!customElements.get('mp-controlled-input-test')) {
  customElements.define('mp-controlled-input-test', ControlledInputElement);
}
if (!customElements.get('mp-controlled-textarea-test')) {
  customElements.define('mp-controlled-textarea-test', ControlledTextareaElement);
}
if (!customElements.get('mp-dynamic-root-test')) {
  customElements.define('mp-dynamic-root-test', DynamicRootElement);
}

/** Mount a fresh counter element and return it once connected + rendered. */
function mountCounter(attributes: Record<string, string> = {}): CounterElement {
  const element = document.createElement('mp-counter-test') as CounterElement;
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }
  document.body.append(element);
  return element;
}

const tick = (): Promise<void> => Promise.resolve();

function liveBindingsView(value: string, disabled: boolean, handler: () => void): TemplateResult {
  return html`
    <div class=${['field', { enabled: !disabled }]}>
      <input
        .value=${value}
        ?disabled=${disabled}
        @click=${handler}
      />
      <span>${value}</span>
    </div>
  `;
}

function positionalListView(items: readonly string[], show: boolean): TemplateResult {
  return html`
    <ul>
      ${items.map(
        (item) => html`
          <li>${item}</li>
        `,
      )}
    </ul>
    ${
      show
        ? html`
            <strong>shown</strong>
          `
        : nothing
    }
  `;
}

function eventView(handler: (() => void) | undefined): TemplateResult {
  return html`
    <button @click=${handler}>go</button>
  `;
}

function idNumber(id: string): number {
  return Number(id.slice('forge-'.length));
}

export {
  idNumber,
  PreUpgradeElement,
  contextReader,
  conditionalRangeView,
  directDefinition,
  CounterElement,
  UpdatedCallbackElement,
  StyledElement,
  NormalizedValuesElement,
  ChildrenElement,
  DynamicSlotElement,
  StyledProjectionElement,
  MaterializingSlotElement,
  StyledMaterializingOwnerElement,
  FallbackSlotElement,
  ControlledInputElement,
  ControlledTextareaElement,
  DynamicRootElement,
  mountCounter,
  tick,
  liveBindingsView,
  positionalListView,
  eventView,
};
