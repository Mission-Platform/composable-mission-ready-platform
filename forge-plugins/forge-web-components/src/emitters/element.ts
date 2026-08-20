/**
 * Web-Components element-class **printer**.
 *
 * Every decision — which members are reactive, what each one's type is, what
 * runs in `render()`, which lifecycle callbacks exist, what the template looks
 * like — is already taken by `../lower` (and refined by `../optimize`), so this
 * module only serialises a {@link WebComponentsLoweredModule} into the
 * `ForgeElement` subclass and its `customElements.define` registration:
 * - `reactiveProperties` → a `static properties` entry plus a typed field,
 * - `stateFields` → a `{ state: true }` entry plus a typed field seeded in the
 *   generated constructor,
 * - `generatedIds` → a `useId()` value, evaluated once per instance,
 * - `elementRefs` → a `{ current }` cell, `derived` → a getter,
 * - `promotedLocals` → a render-head constant the class owns, so a lifted scope
 *   can read it: a function value as a field (stable identity), a pure
 *   derivation as a getter,
 * - `lifecycle` → `connectedCallback` / `updatedCallback` / `disconnectedCallback`,
 * - `template` → the `render()` body, reading a hoisted module-level constant
 *   when the plan carries one.
 *
 * Because the plan resolves every annotation from the neutral contract
 * (`unknown` being the only fallback), the emitted class never contains `any`.
 *
 * The `static properties` map is annotated with the runtime's own contract,
 * `Record<string, PropertyDeclaration>`. It deliberately is *not* annotated
 * with the component's props type: `ForgeElement` declares the member as
 * `Record<string, PropertyDeclaration>`, and a derived class's static member
 * must stay assignable to the base's — and the map's values are empty
 * `PropertyDeclaration` descriptors, not prop values, so `{}` would not satisfy
 * a prop's own type either.
 *
 * A property whose name is already an `HTMLElement` member (`id`, `title`,
 * `ariaLabel`, …) gets its `static properties` entry but **no field**: the
 * inherited member supplies the type, and re-declaring it as `Props['id']`
 * would not be assignable to the base's `id: string`. The runtime is unaffected
 * — it installs its accessor from the map, not from the field.
 *
 * Every other reactive property is emitted with `declare`, because the *runtime*
 * owns the member: `ForgeElement.finalize()` installs a get/set accessor pair on
 * the prototype for each `static properties` key. A plain field declaration is
 * not inert — under `useDefineForClassFields` it defines an own property on the
 * instance, which shadows that accessor and silently stops the element
 * re-rendering when the property changes. `declare` also exempts the field from
 * `strictPropertyInitialization`, so a *required* prop keeps its exact type
 * instead of being widened to `| undefined` just to satisfy the constructor.
 *
 * A **state** field is accessor-backed for exactly the same reason (its
 * `static properties` entry carries `{ state: true }`), so it is declared the
 * same way and **seeded in a generated constructor** rather than by a field
 * initializer: `this.count = 0` runs through the runtime's setter, whereas
 * `count = 0` would define an own property that masks it — after which no
 * `setCount(…)` write would ever schedule a re-render.
 *
 * Every other instance member the class owns outright (a generated id, a ref
 * cell, an effect's retained teardown, a promoted function) is absent from
 * `static properties`, so there is no accessor for it to shadow. Those are
 * seeded in the constructor too, in declaration order, so one can read another
 * exactly as it did in the render body it came from.
 *
 * A seed the plan marks `deferred` is printed in `setup()` instead — the
 * runtime's one-time hook, called after the host's attributes have been adopted
 * and before the first render. It is the only place a cell seeded *from a
 * property* can be filled: in the constructor every reactive property is still
 * `undefined`, and the render-head constant such a seed usually reads does not
 * exist outside `render()` at all. `plan.setup.replay` carries the head
 * statements to re-state there first.
 */
import { UNKNOWN_TYPE, widenOptionalType } from "../lower.js";

import type {
  WebComponentsLoweredModule,
  WebComponentsPropertyDeclaration,
} from "../lower.js";

/** The runtime type the `static properties` map is annotated with. */
const PROPERTIES_MAP_TYPE = "Record<string, PropertyDeclaration>";

/** Serialise a reactive-member descriptor as its `static properties` value. */
function declarationLiteral(
  declaration: WebComponentsPropertyDeclaration,
): string {
  return declaration.state === true ? "{ state: true }" : "{}";
}

/** The declared type of a state field. */
function stateFieldType(type: string, initializer: string | undefined): string {
  if (initializer === undefined) {
    // Nothing seeds the cell, so the declared type must admit the initial
    // `undefined` the runtime's accessor hands back.
    return type === UNKNOWN_TYPE ? type : widenOptionalType(type);
  }
  return type;
}

/** The custom-element registration guard emitted after the class. */
function registration(
  tagName: string,
  className: string,
  registrationExtends: string | undefined,
): string[] {
  const define =
    registrationExtends === undefined
      ? `customElements.define('${tagName}', ${className});`
      : `customElements.define('${tagName}', ${className}, { extends: '${registrationExtends}' });`;
  return [`if (!customElements.get('${tagName}')) {`, `  ${define}`, "}"];
}

/** Print a plan policy as a valid static class literal. */
function policyLiteral(value: object): string {
  return JSON.stringify(value).replace(/"([^"\n]+)":/gu, "$1:");
}

/** Print the `ForgeElement` subclass and its registration for a lowered plan. */
export function synthesiseElementClass(
  plan: WebComponentsLoweredModule,
): string {
  const { template } = plan;
  const definitionName = "__mpDomDefinition";
  const preamble = [
    `const ${definitionName} = {`,
    `  create: ${template.dom.create},`,
    `  parts: ${JSON.stringify(template.dom.partDefinitions)},`,
    ...(template.dom.hot
      ? [
          "  hotTemplate: (document) => {",
          '    const template = document.createElement("template");',
          `    const blueprint = ${definitionName}.create(document);`,
          "    template.content.append(...blueprint.nodes);",
          "    return template;",
          "  },",
        ]
      : []),
    "};",
  ];

  const base =
    plan.host.kind === "customized-built-in"
      ? `ForgeElementMixin(${plan.host.constructorExpression})`
      : plan.host.constructorExpression;
  const lines: string[] = [
    `export class ${plan.className} extends ${base} {`,
    `  static readonly shadow = ${policyLiteral(plan.shadow)};`,
    `  static readonly internals = ${policyLiteral(plan.internals)};`,
  ];
  if (plan.internals.formAssociated === true) {
    lines.push("  static readonly formAssociated = true;");
  }

  if ((plan.styleUrls ?? []).length > 0) {
    lines.push(
      "  static readonly styleUrls: readonly string[] = [",
      ...(plan.styleUrls ?? []).map(
        (styleUrl) =>
          `    new URL(${JSON.stringify(styleUrl)}, import.meta.url).href,`,
      ),
      "  ];",
    );
  }

  // A class cannot declare the same field twice, and a duplicate `static
  // properties` key is a hard parse error. `../optimize` collapses colliding
  // names in the plan; this guard keeps an unoptimized plan printable too.
  const emitted = new Set<string>();
  const claim = (name: string): boolean => {
    if (emitted.has(name)) {
      return false;
    }
    emitted.add(name);
    return true;
  };
  const properties = plan.reactiveProperties.filter((property) =>
    claim(property.name),
  );
  const stateFields = plan.stateFields.filter((field) => claim(field.name));
  const generatedIds = plan.generatedIds.filter((generated) =>
    claim(generated.name),
  );

  const declarations = [
    ...properties.map(
      (property) =>
        `    ${property.name}: ${declarationLiteral(property.declaration)},`,
    ),
    ...stateFields.map(
      (field) => `    ${field.name}: ${declarationLiteral(field.declaration)},`,
    ),
  ];
  if (declarations.length > 0) {
    lines.push(
      `  static readonly properties: ${PROPERTIES_MAP_TYPE} = {`,
      ...declarations,
      "  };",
    );
  }
  for (const property of properties) {
    // An inherited `HTMLElement` member already declares the field; a narrower
    // re-declaration would not be assignable to the base's.
    if (!property.inherited) {
      lines.push(`  declare ${property.name}: ${property.type};`);
    }
  }
  // Everything the constructor seeds, in declaration order, so a member that
  // reads another sees the same value it saw in the render body — and everything
  // deferred to `setup()`, in the same order, for the same reason.
  const seeded: string[] = [];
  const deferred: string[] = [];
  for (const field of stateFields) {
    lines.push(
      `  declare ${field.name}: ${stateFieldType(field.type, field.initializer)};`,
    );
    if (field.initializer !== undefined) {
      (field.deferred ? deferred : seeded).push(
        `this.${field.name} = ${field.initializer};`,
      );
    }
  }
  for (const generated of generatedIds) {
    // Seeded once per element instance rather than once per render, so the id an
    // element hands to its `<label for>` never changes underneath it.
    lines.push(`  readonly ${generated.name}: ${generated.type};`);
    seeded.push(`this.${generated.name} = useId();`);
  }
  const effectDependencyFields = new Set(
    plan.lifecycle
      .flatMap((hook) => hook.statements)
      .flatMap((statement) =>
        [...statement.matchAll(/this\.(__mpEffectDeps\d+)/gu)].map(
          (match) => match[1],
        ),
      )
      .filter((name): name is string => name !== undefined),
  );
  for (const field of effectDependencyFields) {
    lines.push(`  declare ${field}: readonly unknown[] | undefined;`);
  }
  for (const reference of plan.elementRefs) {
    const cell = `{ current: ${reference.elementType} }`;
    // A deferred cell is filled in `setup()`, so it cannot be `readonly`, and it
    // is `declare`d rather than declared: the assignment is the definition, which
    // `strictPropertyInitialization` cannot see from here.
    lines.push(
      reference.deferred
        ? `  declare ${reference.name}: ${cell};`
        : `  readonly ${reference.name}: ${cell};`,
    );
    (reference.deferred ? deferred : seeded).push(
      `this.${reference.name} = { current: ${reference.initializer} };`,
    );
  }
  for (const field of plan.cleanupFields) {
    lines.push(`  ${field.name}: ${field.type} = undefined;`);
  }
  for (const local of plan.promotedLocals) {
    // A function value, so a field initializer is enough: creating the closure
    // has no effect, and its body still runs only when it is called.
    if (local.kind === "field") {
      lines.push(`  readonly ${local.name} = ${local.expression};`);
    }
  }
  if (seeded.length > 0) {
    lines.push(
      "",
      "  constructor() {",
      "    super();",
      ...seeded.map((statement) => `    ${statement}`),
      "  }",
    );
  }
  if (deferred.length > 0) {
    // `ForgeElement.setup()` runs once per element, after the host's attributes
    // have been adopted onto their properties and before the first render, so a
    // seed here reads the values the element was actually given. The replayed
    // head statements come first: they are what the seeds read.
    lines.push(
      "",
      "  setup() {",
      ...[...plan.setup.replay, ...deferred].map(
        (statement) => `    ${statement}`,
      ),
      "  }",
    );
  }

  for (const local of plan.promotedLocals) {
    if (local.kind === "getter") {
      const body = [...local.statements, `return ${local.expression};`];
      lines.push(
        "",
        `  get ${local.name}() {`,
        ...body.map((statement) => `    ${statement}`),
        "  }",
      );
    }
  }

  for (const derived of plan.derived) {
    // A block-bodied memo brings its own statements (including its `return`);
    // only a concise one is a single expression the getter returns.
    const body =
      derived.body.kind === "block"
        ? derived.body.statements.map((line) =>
            line.length === 0 ? "" : `    ${line}`,
          )
        : [`    return ${derived.body.expression};`];
    lines.push("", `  get ${derived.name}() {`, ...body, "  }");
  }

  for (const hook of plan.lifecycle) {
    lines.push("", `  ${hook.callback}() {`);
    if (hook.callsSuper) {
      lines.push(`    super.${hook.callback}();`);
    }
    lines.push(
      ...hook.statements.map((statement) => `    ${statement}`),
      "  }",
    );
  }

  lines.push("", "  render() {");
  lines.push(...template.head.map((statement) => `    ${statement}`));
  lines.push(
    `    return new DomTemplateResult(${definitionName}, [${template.dom.values.join(", ")}]);`,
  );
  lines.push(
    "  }",
    "}",
    ...registration(
      plan.tagName,
      plan.className,
      plan.host.registrationExtends,
    ),
  );

  return [...preamble, ...lines].join("\n");
}
