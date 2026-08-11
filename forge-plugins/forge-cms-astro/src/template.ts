/**
 * `.astro` template generation.
 *
 * Two shapes are emitted, chosen by the neutral content model's `interactive`
 * flag:
 *
 * - **static** — frontmatter read straight from the enriched generic AST
 *   (imports, retained declarations, the `Astro.props` binding) plus the
 *   component's own return expression as markup, with `className`/`htmlFor`
 *   rewritten to their HTML names and the outer fragment stripped. Nothing is
 *   reparsed: every fragment is source-backed text the frontend recorded.
 * - **island** — a `client:load` render of the component the *bound framework
 *   plugin* co-generated into the sibling `island/` tree. Astro no longer
 *   re-implements state, refs, effects, and events in vanilla DOM; a real
 *   framework runtime hydrates the component instead.
 */
import type { ContentComponent } from "@mission-platform/forge-cms-plugin-api";
import type {
  CompilerDiagnostic,
  GenericComponent,
  GenericStatementKind,
  SemanticModule,
  SourceBackedExpression,
  SourceSpan,
} from "@mission-platform/forge-plugin-api";

/** Module-level statement kinds Astro keeps verbatim in the frontmatter. */
const RETAINED_STATEMENT_KINDS: ReadonlySet<GenericStatementKind> =
  new Set<GenericStatementKind>([
    "interface",
    "type-alias",
    "enum",
    "variable",
    "function",
  ]);

const FALLBACK_MARKUP = "<!-- Forge Astro component could not be lowered. -->";

/** A prop default that cannot cross the island boundary as JSON. */
function expressionIsUnsafe(expression: SourceBackedExpression): boolean {
  return /\b(?:function|window|document|globalThis|Symbol|BigInt)\b|=>|\bnew\s/.test(
    expression.text,
  );
}

function diagnostic(
  ir: SemanticModule,
  severity: CompilerDiagnostic["severity"],
  code: string,
  message: string,
  span?: SourceSpan,
): CompilerDiagnostic {
  return {
    phase: "generation",
    severity,
    code,
    message,
    fileName: ir.fileName,
    span,
  };
}

/** The `const props = Astro.props;` line for a component's parameter. */
function propertiesBinding(component: GenericComponent): string {
  const parameter = component.parameter;
  if (parameter === undefined) {
    return "";
  }
  if (parameter.binding === "object-pattern") {
    return `const ${parameter.text} = Astro.props;`;
  }
  const type = parameter.type?.text;
  return `const ${parameter.text} = Astro.props${type ? ` as ${type}` : ""};`;
}

/** Rewrite JSX-only attribute names and strip the outer fragment. */
export function astroMarkup(expression: string): string {
  return expression
    .replaceAll(/\bclassName\s*=/g, "class=")
    .replaceAll(/\bhtmlFor\s*=/g, "for=")
    .replace(/^<>/, "")
    .replace(/<\/>$/, "");
}

/** Assemble an `.astro` file from its frontmatter lines and markup. */
function astroFile(frontmatter: readonly string[], markup: string): string {
  return `---\n${frontmatter.filter((line) => line.length > 0).join("\n")}\n---\n${markup}\n`;
}

/** Collect the diagnostics the Astro lowering reports for a module. */
export function astroDiagnostics(
  ir: SemanticModule,
  component: ContentComponent,
): readonly CompilerDiagnostic[] {
  const diagnostics: CompilerDiagnostic[] = [];

  for (const dynamicNode of ir.intentions.dynamicNodes) {
    diagnostics.push(
      diagnostic(
        ir,
        "warning",
        "FORGE_ASTRO_DYNAMIC_RENDER_UNSUPPORTED",
        `Dynamic render target "${dynamicNode.expression.text}" is not lowered in static Astro output.`,
        dynamicNode.span,
      ),
    );
  }

  if (ir.intentions.renderTree.length === 0) {
    diagnostics.push(
      diagnostic(
        ir,
        "warning",
        "FORGE_ASTRO_RENDER_TREE_EMPTY",
        `No render roots were inferred for ${component.names.publicName}; emitting the source-backed fallback.`,
      ),
    );
  }

  if (component.interactive) {
    for (const property of ir.intentions.props) {
      if (
        property.defaultValue !== undefined &&
        expressionIsUnsafe(property.defaultValue)
      ) {
        diagnostics.push(
          diagnostic(
            ir,
            "warning",
            "FORGE_ASTRO_UNSAFE_SERIALIZATION",
            `Prop default "${property.name}" contains a browser-only or non-serializable expression and cannot cross the Astro island boundary safely.`,
            property.defaultValue.span,
          ),
        );
      }
    }
  }

  if (ir.ast.component === undefined) {
    diagnostics.push(
      diagnostic(
        ir,
        "warning",
        "FORGE_ASTRO_COMPONENT_EXPORT_UNSUPPORTED",
        `Astro component "${component.names.neutralName}" must be an exported function declaration.`,
      ),
    );
  }

  return diagnostics;
}

/** Emit the static `.astro` template for a presentational component. */
export function emitStaticAstroTemplate(ir: SemanticModule): string {
  const component = ir.ast.component;
  if (component === undefined) {
    return astroFile([], FALLBACK_MARKUP);
  }

  const imports = ir.ast.imports.map((entry) => entry.text);
  const declarations = ir.ast.declarations
    .filter((statement) =>
      RETAINED_STATEMENT_KINDS.has(statement.statementKind),
    )
    .map((statement) => statement.text.text);

  const frontmatter = [
    ...imports,
    ...(imports.length > 0 && declarations.length > 0 ? [""] : []),
    ...declarations,
    propertiesBinding(component),
  ];

  const markup =
    component.returnExpression === undefined
      ? FALLBACK_MARKUP
      : astroMarkup(component.returnExpression.text);

  return astroFile(frontmatter, markup);
}

/**
 * Emit the island-backed `.astro` template for an interactive component.
 *
 * The component is imported from the co-generated island tree — the same
 * neutral IR compiled by the bound framework plugin — and hydrated with
 * `client:load`, so its behaviour matches every other framework build.
 */
export function emitIslandAstroTemplate(
  component: ContentComponent,
  islandEntry: string,
): string {
  const name = component.names.publicName;
  const frontmatter = [
    `import { ${name} } from '${islandEntry}';`,
    "",
    "const props = Astro.props;",
  ];
  const markup = component.slots.includes("default")
    ? `<${name}\n  client:load\n  {...props}\n>\n  <slot />\n</${name}>`
    : `<${name}\n  client:load\n  {...props}\n/>`;
  return astroFile(frontmatter, markup);
}
