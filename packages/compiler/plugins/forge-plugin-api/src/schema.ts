import {
  createCompilerDiagnostic,
  type CompilerDiagnostic,
} from "./diagnostics.js";

import type {
  FrameworkId,
  TargetIntentions,
  TargetLoweredModule,
} from "./framework.js";
import type { SourceSpan } from "./ir.js";

/** Supported field types for declarative schema validation. */
export type SchemaFieldType =
  "string" | "non-empty-string" | "object" | "array" | "boolean";

/** A single schema validation issue identified during intention checking. */
export interface SchemaValidationIssue {
  readonly path: string;
  readonly message: string;
  readonly code: string;
  readonly span?: SourceSpan;
}

/** Structured result of target intention validation. */
export interface TargetIntentionsValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly diagnostics: readonly CompilerDiagnostic[];
}

/** Declarative rule applied to a schema property. */
export interface SchemaFieldRule {
  readonly path: string;
  readonly code: string;
  readonly required?: boolean;
  readonly type?: SchemaFieldType;
  readonly allowedValues?: readonly unknown[];
  readonly message?: string;
  readonly custom?: (
    value: unknown,
    root: unknown,
  ) =>
    | {
        readonly valid: boolean;
        readonly message: string;
        readonly span?: SourceSpan;
        readonly path?: string;
      }
    | undefined;
}

/** Declarative schema definition for compiler intermediate representations. */
export interface DeclarativeSchema {
  readonly name: string;
  readonly rules: readonly SchemaFieldRule[];
}

/** Options configuring declarative schema validation. */
export interface SchemaValidationOptions {
  readonly basePath?: string;
  readonly root?: unknown;
  readonly fallbackSpan?: SourceSpan;
}

/**
 * Checks whether an arbitrary value is a non-null object record.
 *
 * @param value - Value to test.
 * @returns True if value is an object record.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Checks whether an arbitrary value conforms to the SourceSpan shape.
 *
 * @param value - Value to test.
 * @returns True if value is a SourceSpan.
 */
function isSourceSpan(value: unknown): value is SourceSpan {
  return (
    isRecord(value) &&
    typeof value.start === "number" &&
    typeof value.end === "number"
  );
}

/**
 * Searches an array of candidate values for the first actionable source span.
 *
 * @param items - Candidates to inspect.
 * @returns The first discovered SourceSpan, or undefined.
 */
function findSpanInArray(items: unknown): SourceSpan | undefined {
  if (!Array.isArray(items)) {
    return undefined;
  }
  for (const item of items) {
    const span = findActionableSpan(item);
    if (span !== undefined) {
      return span;
    }
  }
  return undefined;
}

/**
 * Finds a source span within an AST object representation.
 *
 * @param ast - AST container object.
 * @returns SourceSpan if found, or undefined.
 */
function findSpanInAst(ast: Record<string, unknown>): SourceSpan | undefined {
  if (isSourceSpan(ast.span)) {
    return ast.span;
  }
  return findSpanInArray(ast.renderNodes) ?? findSpanInArray(ast.declarations);
}

/**
 * Finds a source span within an intentions object representation.
 *
 * @param intentions - Intentions container object.
 * @returns SourceSpan if found, or undefined.
 */
function findSpanInIntentions(
  intentions: Record<string, unknown>,
): SourceSpan | undefined {
  return (
    findSpanInArray(intentions.renderTree) ?? findSpanInArray(intentions.props)
  );
}

/** Recursively search for an actionable source span within intentions or their AST facts. */
export function findActionableSpan(value: unknown): SourceSpan | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  if (isSourceSpan(value.span)) {
    return value.span;
  }
  if (isRecord(value.module)) {
    const span = findActionableSpan(value.module);
    if (span !== undefined) {
      return span;
    }
  }
  if (isRecord(value.ast)) {
    const span = findSpanInAst(value.ast);
    if (span !== undefined) {
      return span;
    }
  }
  if (isRecord(value.intentions)) {
    const span = findSpanInIntentions(value.intentions);
    if (span !== undefined) {
      return span;
    }
  }
  if (isRecord(value.lowered) && isSourceSpan(value.lowered.span)) {
    return value.lowered.span;
  }
  return undefined;
}

/** Schema validating the structure of a lowered target plan. */
export const targetLoweredModuleSchema: DeclarativeSchema = {
  name: "TargetLoweredModule",
  rules: [
    {
      path: "framework",
      code: "FORGE_INTENTIONS_INVALID_LOWERED_FRAMEWORK",
      required: true,
      type: "non-empty-string",
      message:
        "Target intentions lowered plan must define a non-empty framework discriminator.",
    },
    {
      path: "appliedOptimizations",
      code: "FORGE_INTENTIONS_INVALID_OPTIMIZATIONS",
      required: true,
      type: "array",
      custom: (value) => {
        if (!Array.isArray(value)) {
          return {
            valid: false,
            message:
              "Target intentions lowered plan must define an appliedOptimizations array.",
          };
        }
        return value.some((item) => typeof item !== "string")
          ? {
              valid: false,
              message:
                "Every entry in lowered appliedOptimizations must be a string.",
            }
          : undefined;
      },
    },
  ],
};

/** Schema validating the compilation target context. */
export const targetContextSchema: DeclarativeSchema = {
  name: "TargetContext",
  rules: [
    {
      path: "framework",
      code: "FORGE_INTENTIONS_INVALID_CONTEXT",
      required: true,
      type: "non-empty-string",
      message: "Target context must define a non-empty framework identifier.",
    },
    {
      path: "moduleKind",
      code: "FORGE_INTENTIONS_INVALID_CONTEXT",
      required: true,
      allowedValues: ["component", "composable"],
      custom: (value) =>
        value === "component" || value === "composable"
          ? undefined
          : {
              valid: false,
              message: `Target context moduleKind must be "component" or "composable", received "${String(value)}".`,
            },
    },
  ],
};

/** Schema validating the incoming semantic module IR. */
export const semanticModuleSchema: DeclarativeSchema = {
  name: "SemanticModule",
  rules: [
    {
      path: "kind",
      code: "FORGE_INTENTIONS_INVALID_MODULE",
      required: true,
      allowedValues: ["semantic-module"],
      custom: (value) =>
        value === "semantic-module"
          ? undefined
          : {
              valid: false,
              message: `Semantic module must have kind "semantic-module", received "${String(value)}".`,
            },
    },
    {
      path: "moduleKind",
      code: "FORGE_INTENTIONS_INVALID_MODULE",
      required: true,
      allowedValues: ["component", "composable"],
      custom: (value) =>
        value === "component" || value === "composable"
          ? undefined
          : {
              valid: false,
              message: `Semantic module moduleKind must be "component" or "composable", received "${String(value)}".`,
            },
    },
    {
      path: "fileName",
      code: "FORGE_INTENTIONS_INVALID_MODULE",
      required: true,
      type: "non-empty-string",
      message: "Semantic module must define a non-empty fileName.",
    },
    {
      path: "ast",
      code: "FORGE_INTENTIONS_INVALID_MODULE",
      required: true,
      type: "object",
      custom: (value) => {
        if (!isRecord(value)) {
          return {
            valid: false,
            message:
              'Semantic module ast must be a generic module AST with kind "generic-module".',
          };
        }
        return value.kind === "generic-module"
          ? undefined
          : {
              valid: false,
              path: "ast.kind",
              message: `Semantic module ast must be a generic module AST with kind "generic-module", received "${String(value.kind)}".`,
              span: findActionableSpan(value),
            };
      },
    },
    {
      path: "imports",
      code: "FORGE_INTENTIONS_INVALID_MODULE",
      required: true,
      type: "array",
      message: "Semantic module must define an imports array.",
    },
    {
      path: "intentions",
      code: "FORGE_INTENTIONS_INVALID_MODULE",
      required: true,
      type: "object",
      message: "Semantic module must define semantic intentions.",
    },
  ],
};

/** Schema validating target intentions. */
export const targetIntentionsSchema: DeclarativeSchema = {
  name: "TargetIntentions",
  rules: [
    {
      path: "framework",
      code: "FORGE_INTENTIONS_MISSING_FRAMEWORK",
      required: true,
      type: "non-empty-string",
      message:
        "Target intentions must define a non-empty framework identifier.",
    },
    {
      path: "context",
      code: "FORGE_INTENTIONS_MISSING_CONTEXT",
      required: true,
      type: "object",
      message: "Target intentions must define a target context.",
    },
    {
      path: "module",
      code: "FORGE_INTENTIONS_MISSING_MODULE",
      required: true,
      type: "object",
      message: "Target intentions must contain a semantic module.",
    },
    {
      path: "lowered",
      code: "FORGE_INTENTIONS_MISSING_LOWERED",
      required: true,
      type: "object",
      custom: (value, root) =>
        isRecord(value)
          ? undefined
          : {
              valid: false,
              message: `Target intentions for "${
                isRecord(root) &&
                typeof root.framework === "string" &&
                root.framework.length > 0
                  ? root.framework
                  : "unknown"
              }" must contain a lowered target plan.`,
            },
    },
  ],
};

/**
 * Evaluates custom validation rule if defined.
 *
 * @param rule - The schema field rule.
 * @param value - Field value.
 * @param options - Schema validation options.
 * @param defaultPath - Default error path if custom error does not specify one.
 * @param defaultSpan - Fallback source span.
 * @returns Validation issue if invalid, or undefined.
 */
function evaluateCustomValidation(
  rule: SchemaFieldRule,
  value: unknown,
  options: SchemaValidationOptions,
  defaultPath: string,
  defaultSpan: SourceSpan | undefined,
): SchemaValidationIssue | undefined {
  if (rule.custom === undefined) {
    return undefined;
  }
  const customResult = rule.custom(value, options.root);
  if (customResult !== undefined && !customResult.valid) {
    const issuePath = customResult.path
      ? options.basePath
        ? `${options.basePath}.${customResult.path}`
        : customResult.path
      : defaultPath;
    return {
      path: issuePath,
      code: rule.code,
      message: customResult.message,
      span: customResult.span ?? defaultSpan,
    };
  }
  return undefined;
}

/**
 * Checks whether a value matches the declared schema field type.
 *
 * @param type - Expected type discriminator.
 * @param value - Value to check.
 * @returns True if the value matches the type.
 */
function matchesSchemaType(type: SchemaFieldType, value: unknown): boolean {
  switch (type) {
    case "string": {
      return typeof value === "string";
    }
    case "non-empty-string": {
      return typeof value === "string" && value.length > 0;
    }
    case "object": {
      return isRecord(value);
    }
    case "array": {
      return Array.isArray(value);
    }
    case "boolean": {
      return typeof value === "boolean";
    }
    default: {
      return true;
    }
  }
}

/**
 * Validates a required field rule when the value is absent.
 *
 * @param rule - Schema field rule.
 * @param value - Extracted value.
 * @param schema - Declarative schema.
 * @param options - Validation options.
 * @param fullPath - Full path string.
 * @param span - Detected or fallback source span.
 * @returns SchemaValidationIssue if required check fails, or undefined.
 */
function validateRequiredRule(
  rule: SchemaFieldRule,
  value: unknown,
  schema: DeclarativeSchema,
  options: SchemaValidationOptions,
  fullPath: string,
  span: SourceSpan | undefined,
): SchemaValidationIssue | undefined {
  if (!rule.required || (value !== undefined && value !== null)) {
    return undefined;
  }
  const customIssue = evaluateCustomValidation(
    rule,
    value,
    options,
    fullPath,
    span,
  );
  if (customIssue !== undefined) {
    return customIssue;
  }
  return {
    path: fullPath,
    code: rule.code,
    message: rule.message ?? `${schema.name} field "${fullPath}" is required.`,
    span,
  };
}

/**
 * Validates field type when rule.type is specified.
 *
 * @param rule - Schema field rule.
 * @param value - Extracted value.
 * @param schema - Declarative schema.
 * @param options - Validation options.
 * @param fullPath - Full path string.
 * @param span - Detected or fallback source span.
 * @returns SchemaValidationIssue if type check fails, or undefined.
 */
function validateTypeRule(
  rule: SchemaFieldRule,
  value: unknown,
  schema: DeclarativeSchema,
  options: SchemaValidationOptions,
  fullPath: string,
  span: SourceSpan | undefined,
): SchemaValidationIssue | undefined {
  if (rule.type === undefined || matchesSchemaType(rule.type, value)) {
    return undefined;
  }
  const customIssue = evaluateCustomValidation(
    rule,
    value,
    options,
    fullPath,
    span,
  );
  if (customIssue !== undefined) {
    return customIssue;
  }
  return {
    path: fullPath,
    code: rule.code,
    message:
      rule.message ??
      `${schema.name} field "${fullPath}" must be of type ${rule.type}.`,
    span,
  };
}

/**
 * Validates field allowed values when rule.allowedValues is specified.
 *
 * @param rule - Schema field rule.
 * @param value - Extracted value.
 * @param schema - Declarative schema.
 * @param options - Validation options.
 * @param fullPath - Full path string.
 * @param span - Detected or fallback source span.
 * @returns SchemaValidationIssue if allowed values check fails, or undefined.
 */
function validateAllowedValuesRule(
  rule: SchemaFieldRule,
  value: unknown,
  schema: DeclarativeSchema,
  options: SchemaValidationOptions,
  fullPath: string,
  span: SourceSpan | undefined,
): SchemaValidationIssue | undefined {
  if (
    rule.allowedValues === undefined ||
    rule.allowedValues.includes(value as never)
  ) {
    return undefined;
  }
  const customIssue = evaluateCustomValidation(
    rule,
    value,
    options,
    fullPath,
    span,
  );
  if (customIssue !== undefined) {
    return customIssue;
  }
  const expected = rule.allowedValues
    .map((allowedValue) => `"${String(allowedValue)}"`)
    .join(" or ");
  return {
    path: fullPath,
    code: rule.code,
    message:
      rule.message ??
      `${schema.name} ${rule.path} must be ${expected}, received "${String(value)}".`,
    span,
  };
}

/**
 * Validates a single schema rule against an extracted field value.
 *
 * @param rule - Schema field rule definition.
 * @param value - Extracted value of the field.
 * @param schema - Parent declarative schema.
 * @param options - Schema validation options.
 * @returns SchemaValidationIssue if validation fails, or undefined if valid.
 */
function validateSchemaRule(
  rule: SchemaFieldRule,
  value: unknown,
  schema: DeclarativeSchema,
  options: SchemaValidationOptions,
): SchemaValidationIssue | undefined {
  const fullPath = options.basePath
    ? `${options.basePath}.${rule.path}`
    : rule.path;
  const valueSpan = isRecord(value) ? findActionableSpan(value) : undefined;
  const span = valueSpan ?? options.fallbackSpan;

  const requiredIssue = validateRequiredRule(
    rule,
    value,
    schema,
    options,
    fullPath,
    span,
  );
  if (requiredIssue !== undefined) {
    return requiredIssue;
  }

  if (value === undefined || value === null) {
    return undefined;
  }

  const typeIssue = validateTypeRule(
    rule,
    value,
    schema,
    options,
    fullPath,
    span,
  );
  if (typeIssue !== undefined) {
    return typeIssue;
  }

  const allowedIssue = validateAllowedValuesRule(
    rule,
    value,
    schema,
    options,
    fullPath,
    span,
  );
  if (allowedIssue !== undefined) {
    return allowedIssue;
  }

  return evaluateCustomValidation(rule, value, options, fullPath, span);
}

/**
 * Validates a target object against a declarative schema, collecting all structural issues.
 *
 * @param target - Target object or record to validate.
 * @param schema - Declarative schema defining structural rules.
 * @param options - Validation configuration options.
 * @returns Array of collected validation issues.
 */
export function validateAgainstSchema(
  target: unknown,
  schema: DeclarativeSchema,
  options?: SchemaValidationOptions,
): SchemaValidationIssue[] {
  const targetRecord = isRecord(target) ? target : undefined;
  const resolvedOptions: SchemaValidationOptions = {
    basePath: options?.basePath,
    root: options?.root ?? target,
    fallbackSpan: options?.fallbackSpan,
  };

  const issues: SchemaValidationIssue[] = [];
  for (const rule of schema.rules) {
    const value = targetRecord?.[rule.path];
    const issue = validateSchemaRule(rule, value, schema, resolvedOptions);
    if (issue !== undefined) {
      issues.push(issue);
    }
  }

  return issues;
}

/** Error thrown when target intentions fail declarative schema verification. */
export class TargetIntentionsValidationError extends TypeError {
  readonly diagnostics: readonly CompilerDiagnostic[];
  readonly validation: TargetIntentionsValidationResult;

  constructor(message: string, validation: TargetIntentionsValidationResult) {
    super(message);
    this.name = "TargetIntentionsValidationError";
    this.validation = validation;
    this.diagnostics = validation.diagnostics;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Creates a validation result for non-object target intentions input.
 *
 * @param expectedFramework - Expected target framework.
 * @returns Failure validation result with not-object diagnostic.
 */
function createNotObjectValidationResult(
  expectedFramework?: FrameworkId,
): TargetIntentionsValidationResult {
  const issue: SchemaValidationIssue = {
    path: "",
    code: "FORGE_INTENTIONS_NOT_OBJECT",
    message: "Target intentions must be an object.",
  };
  const diagnostic = createCompilerDiagnostic({
    phase: "target-lowering",
    severity: "error",
    code: issue.code,
    message: issue.message,
    fileName: "<unknown>",
    targetId: expectedFramework,
  });
  return {
    valid: false,
    errors: [issue.message],
    diagnostics: [diagnostic],
  };
}

/**
 * Resolves the source file name from intentions module metadata.
 *
 * @param intentions - Target intentions record.
 * @returns Discovered file name or default placeholder.
 */
function resolveTargetFileName(intentions: Record<string, unknown>): string {
  if (
    isRecord(intentions.module) &&
    typeof intentions.module.fileName === "string" &&
    intentions.module.fileName.length > 0
  ) {
    return intentions.module.fileName;
  }
  return "<unknown>";
}

/**
 * Resolves target identifier for compiler diagnostics.
 *
 * @param intentions - Target intentions record.
 * @param expectedFramework - Expected target framework.
 * @returns Framework target identifier or undefined.
 */
function resolveTargetFrameworkId(
  intentions: Record<string, unknown>,
  expectedFramework?: FrameworkId,
): string | undefined {
  if (
    typeof intentions.framework === "string" &&
    intentions.framework.length > 0
  ) {
    return intentions.framework;
  }
  return expectedFramework;
}

/**
 * Validates cross-field consistency between root framework and expected framework.
 *
 * @param intentions - Target intentions record.
 * @param expectedFramework - Expected framework.
 * @param rootSpan - Fallback source span.
 * @returns Array of framework mismatch issues.
 */
function validateRootFramework(
  intentions: Record<string, unknown>,
  expectedFramework?: FrameworkId,
  rootSpan?: SourceSpan,
): SchemaValidationIssue[] {
  if (
    typeof intentions.framework === "string" &&
    intentions.framework.length > 0 &&
    expectedFramework !== undefined &&
    intentions.framework !== expectedFramework
  ) {
    return [
      {
        path: "framework",
        code: "FORGE_INTENTIONS_FRAMEWORK_MISMATCH",
        message: `Target intentions root framework "${intentions.framework}" does not match expected target "${expectedFramework}".`,
        span: rootSpan,
      },
    ];
  }
  return [];
}

/**
 * Validates the context section of target intentions and its cross-field consistency.
 *
 * @param intentions - Target intentions record.
 * @param rootSpan - Fallback source span.
 * @returns Array of context validation issues.
 */
function validateContextSection(
  intentions: Record<string, unknown>,
  rootSpan?: SourceSpan,
): SchemaValidationIssue[] {
  if (!isRecord(intentions.context)) {
    return [];
  }
  const context = intentions.context;
  const contextSpan = findActionableSpan(context) ?? rootSpan;
  const issues = validateAgainstSchema(context, targetContextSchema, {
    basePath: "context",
    root: intentions,
    fallbackSpan: contextSpan,
  });

  if (
    typeof context.framework === "string" &&
    context.framework.length > 0 &&
    typeof intentions.framework === "string" &&
    intentions.framework.length > 0 &&
    context.framework !== intentions.framework
  ) {
    issues.push({
      path: "context.framework",
      code: "FORGE_INTENTIONS_INVALID_CONTEXT",
      message: `Target context framework "${context.framework}" does not match target intentions framework "${intentions.framework}".`,
      span: contextSpan,
    });
  }

  return issues;
}

/**
 * Validates the semantic module section of target intentions and its cross-field consistency.
 *
 * @param intentions - Target intentions record.
 * @param rootSpan - Fallback source span.
 * @returns Array of module validation issues.
 */
function validateModuleSection(
  intentions: Record<string, unknown>,
  rootSpan?: SourceSpan,
): SchemaValidationIssue[] {
  if (!isRecord(intentions.module)) {
    return [];
  }
  const module_ = intentions.module;
  const moduleSpan = findActionableSpan(module_) ?? rootSpan;
  const issues = validateAgainstSchema(module_, semanticModuleSchema, {
    basePath: "module",
    root: intentions,
    fallbackSpan: moduleSpan,
  });

  if (
    (module_.moduleKind === "component" ||
      module_.moduleKind === "composable") &&
    isRecord(intentions.context) &&
    (intentions.context.moduleKind === "component" ||
      intentions.context.moduleKind === "composable") &&
    module_.moduleKind !== intentions.context.moduleKind
  ) {
    issues.push({
      path: "module.moduleKind",
      code: "FORGE_INTENTIONS_INVALID_MODULE",
      message: `Semantic module moduleKind "${module_.moduleKind}" does not match context moduleKind "${intentions.context.moduleKind}".`,
      span: moduleSpan,
    });
  }

  return issues;
}

/**
 * Validates the lowered section of target intentions and its cross-field consistency.
 *
 * @param intentions - Target intentions record.
 * @param expectedFramework - Expected target framework.
 * @param rootSpan - Fallback source span.
 * @returns Array of lowered section validation issues.
 */
function validateLoweredSection(
  intentions: Record<string, unknown>,
  expectedFramework?: FrameworkId,
  rootSpan?: SourceSpan,
): SchemaValidationIssue[] {
  if (!isRecord(intentions.lowered)) {
    return [];
  }
  const lowered = intentions.lowered;
  const loweredSpan = findActionableSpan(lowered) ?? rootSpan;
  const issues = validateAgainstSchema(lowered, targetLoweredModuleSchema, {
    basePath: "lowered",
    root: intentions,
    fallbackSpan: loweredSpan,
  });

  if (typeof lowered.framework === "string" && lowered.framework.length > 0) {
    if (
      expectedFramework !== undefined &&
      lowered.framework !== expectedFramework
    ) {
      issues.push({
        path: "lowered.framework",
        code: "FORGE_INTENTIONS_LOWERED_FRAMEWORK_MISMATCH",
        message: `Target intentions lowered plan framework "${lowered.framework}" does not match expected target "${expectedFramework}".`,
        span: loweredSpan,
      });
    }

    if (
      typeof intentions.framework === "string" &&
      intentions.framework.length > 0 &&
      lowered.framework !== intentions.framework
    ) {
      issues.push({
        path: "lowered.framework",
        code: "FORGE_INTENTIONS_LOWERED_FRAMEWORK_MISMATCH",
        message: `Target intentions root framework "${intentions.framework}" does not match lowered plan framework "${lowered.framework}".`,
        span: loweredSpan,
      });
    }
  }

  return issues;
}

/**
 * Validates the structure and integrity of target intentions against the declarative schema.
 * Returns structured validation errors and corresponding CompilerDiagnostic objects with source locations.
 */
export function validateTargetIntentions(
  intentions: unknown,
  expectedFramework?: FrameworkId,
): TargetIntentionsValidationResult {
  if (!isRecord(intentions)) {
    return createNotObjectValidationResult(expectedFramework);
  }

  const rootSpan = findActionableSpan(intentions);
  const issues: SchemaValidationIssue[] = [
    ...validateAgainstSchema(intentions, targetIntentionsSchema, {
      root: intentions,
      fallbackSpan: rootSpan,
    }),
    ...validateRootFramework(intentions, expectedFramework, rootSpan),
    ...validateContextSection(intentions, rootSpan),
    ...validateModuleSection(intentions, rootSpan),
    ...validateLoweredSection(intentions, expectedFramework, rootSpan),
  ];

  const fileName = resolveTargetFileName(intentions);
  const targetId = resolveTargetFrameworkId(intentions, expectedFramework);

  const diagnostics = issues.map((issue) =>
    createCompilerDiagnostic({
      phase: "target-lowering",
      severity: "error",
      code: issue.code,
      message: issue.message,
      fileName,
      span: issue.span,
      targetId,
    }),
  );

  return {
    valid: issues.length === 0,
    errors: issues.map((issue) => issue.message),
    diagnostics,
  };
}

const PRIMARY_ERROR_PRIORITY_SUBSTRINGS = [
  "must be an object",
  "must contain a lowered target plan",
  "non-empty framework discriminator",
  "lowered plan framework",
] as const;

/**
 * Selects the primary error message to represent a validation failure.
 *
 * @param errors - List of validation error strings.
 * @returns The primary error message.
 */
function pickPrimaryErrorMessage(errors: readonly string[]): string {
  if (errors.length === 0) {
    return "Target intentions validation failed.";
  }
  for (const needle of PRIMARY_ERROR_PRIORITY_SUBSTRINGS) {
    const matched = errors.find((candidateError) =>
      candidateError.includes(needle),
    );
    if (matched !== undefined) {
      return matched;
    }
  }
  return errors[0];
}

/**
 * Asserts that the supplied intentions are valid and contain a lowered target plan.
 * Throws a TargetIntentionsValidationError (subclass of TypeError) if the intentions are incomplete
 * or if the lowered plan discriminator does not match the expected framework.
 */
export function assertTargetIntentionsLowered<
  TLowered extends TargetLoweredModule = TargetLoweredModule,
>(
  intentions: unknown,
  expectedFramework?: FrameworkId,
): asserts intentions is TargetIntentions<TLowered> {
  const result = validateTargetIntentions(intentions, expectedFramework);
  if (result.valid) {
    return;
  }

  const primaryMessage = pickPrimaryErrorMessage(result.errors);
  throw new TargetIntentionsValidationError(primaryMessage, result);
}
