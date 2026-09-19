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
  | "string"
  | "non-empty-string"
  | "object"
  | "array"
  | "boolean";

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSourceSpan(value: unknown): value is SourceSpan {
  return (
    isRecord(value) &&
    typeof value.start === "number" &&
    typeof value.end === "number"
  );
}

/** Recursively search for an actionable source span within intentions or their AST facts. */
export function findActionableSpan(value: unknown): SourceSpan | undefined {
  if (!isRecord(value)) {
    return;
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
    if (isSourceSpan(value.ast.span)) {
      return value.ast.span;
    }
    if (Array.isArray(value.ast.renderNodes)) {
      for (const node of value.ast.renderNodes) {
        const span = findActionableSpan(node);
        if (span !== undefined) {
          return span;
        }
      }
    }
    if (Array.isArray(value.ast.declarations)) {
      for (const decl of value.ast.declarations) {
        const span = findActionableSpan(decl);
        if (span !== undefined) {
          return span;
        }
      }
    }
  }
  if (isRecord(value.intentions)) {
    if (Array.isArray(value.intentions.renderTree)) {
      for (const node of value.intentions.renderTree) {
        const span = findActionableSpan(node);
        if (span !== undefined) {
          return span;
        }
      }
    }
    if (Array.isArray(value.intentions.props)) {
      for (const property of value.intentions.props) {
        const span = findActionableSpan(property);
        if (span !== undefined) {
          return span;
        }
      }
    }
  }
  if (isRecord(value.lowered) && isSourceSpan(value.lowered.span)) {
    return value.lowered.span;
  }
  return;
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
        const hasNonString = value.some((item) => typeof item !== "string");
        if (hasNonString) {
          return {
            valid: false,
            message:
              "Every entry in lowered appliedOptimizations must be a string.",
          };
        }
        return;
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
      custom: (value) => {
        if (value !== "component" && value !== "composable") {
          return {
            valid: false,
            message: `Target context moduleKind must be "component" or "composable", received "${String(value)}".`,
          };
        }
        return;
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
      custom: (value) => {
        if (value !== "semantic-module") {
          return {
            valid: false,
            message: `Semantic module must have kind "semantic-module", received "${String(value)}".`,
          };
        }
        return;
      },
    },
    {
      path: "moduleKind",
      code: "FORGE_INTENTIONS_INVALID_MODULE",
      required: true,
      allowedValues: ["component", "composable"],
      custom: (value) => {
        if (value !== "component" && value !== "composable") {
          return {
            valid: false,
            message: `Semantic module moduleKind must be "component" or "composable", received "${String(value)}".`,
          };
        }
        return;
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
        if (value.kind !== "generic-module") {
          return {
            valid: false,
            path: "ast.kind",
            message: `Semantic module ast must be a generic module AST with kind "generic-module", received "${String(value.kind)}".`,
            span: findActionableSpan(value),
          };
        }
        return;
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
      custom: (value, root) => {
        if (!isRecord(value)) {
          const frameworkName =
            isRecord(root) &&
            typeof root.framework === "string" &&
            root.framework.length > 0
              ? root.framework
              : "unknown";
          return {
            valid: false,
            message: `Target intentions for "${frameworkName}" must contain a lowered target plan.`,
          };
        }
        return;
      },
    },
  ],
};

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
  const fallbackSpan = options.fallbackSpan;

  if (rule.required && (value === undefined || value === null)) {
    if (rule.custom !== undefined) {
      const customResult = rule.custom(value, options.root);
      if (customResult !== undefined && !customResult.valid) {
        const issuePath = customResult.path
          ? options.basePath
            ? `${options.basePath}.${customResult.path}`
            : customResult.path
          : fullPath;
        return {
          path: issuePath,
          code: rule.code,
          message: customResult.message,
          span: customResult.span ?? valueSpan ?? fallbackSpan,
        };
      }
    }
    return {
      path: fullPath,
      code: rule.code,
      message:
        rule.message ?? `${schema.name} field "${fullPath}" is required.`,
      span: valueSpan ?? fallbackSpan,
    };
  }

  if (value === undefined || value === null) {
    return;
  }

  if (rule.type !== undefined) {
    let typeMatches = true;
    switch (rule.type) {
      case "string": {
        typeMatches = typeof value === "string";
        break;
      }
      case "non-empty-string": {
        typeMatches = typeof value === "string" && value.length > 0;
        break;
      }
      case "object": {
        typeMatches = isRecord(value);
        break;
      }
      case "array": {
        typeMatches = Array.isArray(value);
        break;
      }
      case "boolean": {
        typeMatches = typeof value === "boolean";
        break;
      }
    }

    if (!typeMatches) {
      if (rule.custom !== undefined) {
        const customResult = rule.custom(value, options.root);
        if (customResult !== undefined && !customResult.valid) {
          const issuePath = customResult.path
            ? options.basePath
              ? `${options.basePath}.${customResult.path}`
              : customResult.path
            : fullPath;
          return {
            path: issuePath,
            code: rule.code,
            message: customResult.message,
            span: customResult.span ?? valueSpan ?? fallbackSpan,
          };
        }
      }
      return {
        path: fullPath,
        code: rule.code,
        message:
          rule.message ??
          `${schema.name} field "${fullPath}" must be of type ${rule.type}.`,
        span: valueSpan ?? fallbackSpan,
      };
    }
  }

  if (rule.allowedValues !== undefined && !rule.allowedValues.includes(value)) {
    if (rule.custom !== undefined) {
      const customResult = rule.custom(value, options.root);
      if (customResult !== undefined && !customResult.valid) {
        const issuePath = customResult.path
          ? options.basePath
            ? `${options.basePath}.${customResult.path}`
            : customResult.path
          : fullPath;
        return {
          path: issuePath,
          code: rule.code,
          message: customResult.message,
          span: customResult.span ?? valueSpan ?? fallbackSpan,
        };
      }
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
      span: valueSpan ?? fallbackSpan,
    };
  }

  if (rule.custom !== undefined) {
    const customResult = rule.custom(value, options.root);
    if (customResult !== undefined && !customResult.valid) {
      const issuePath = customResult.path
        ? options.basePath
          ? `${options.basePath}.${customResult.path}`
          : customResult.path
        : fullPath;
      return {
        path: issuePath,
        code: rule.code,
        message: customResult.message,
        span: customResult.span ?? valueSpan ?? fallbackSpan,
      };
    }
  }

  return;
}

/**
 * Validates a target object against a declarative schema, collecting all structural issues.
 */
export function validateAgainstSchema(
  target: unknown,
  schema: DeclarativeSchema,
  options?: SchemaValidationOptions,
): SchemaValidationIssue[] {
  const issues: SchemaValidationIssue[] = [];
  const targetRecord = isRecord(target) ? target : undefined;
  const root = options?.root ?? target;
  const resolvedOptions: SchemaValidationOptions = {
    basePath: options?.basePath,
    root,
    fallbackSpan: options?.fallbackSpan,
  };

  for (const rule of schema.rules) {
    const value = targetRecord ? targetRecord[rule.path] : undefined;
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
 * Validates the structure and integrity of target intentions against the declarative schema.
 * Returns structured validation errors and corresponding CompilerDiagnostic objects with source locations.
 */
export function validateTargetIntentions(
  intentions: unknown,
  expectedFramework?: FrameworkId,
): TargetIntentionsValidationResult {
  const issues: SchemaValidationIssue[] = [];

  if (!isRecord(intentions)) {
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

  const fileName =
    isRecord(intentions.module) &&
    typeof intentions.module.fileName === "string" &&
    intentions.module.fileName.length > 0
      ? intentions.module.fileName
      : "<unknown>";

  const rootSpan = findActionableSpan(intentions);

  const targetId =
    typeof intentions.framework === "string" && intentions.framework.length > 0
      ? intentions.framework
      : expectedFramework;

  // 1. Root structural validation driven by targetIntentionsSchema
  const rootIssues = validateAgainstSchema(intentions, targetIntentionsSchema, {
    root: intentions,
    fallbackSpan: rootSpan,
  });
  issues.push(...rootIssues);

  // Cross-field: root framework vs expected target framework
  if (
    typeof intentions.framework === "string" &&
    intentions.framework.length > 0 &&
    expectedFramework !== undefined &&
    intentions.framework !== expectedFramework
  ) {
    issues.push({
      path: "framework",
      code: "FORGE_INTENTIONS_FRAMEWORK_MISMATCH",
      message: `Target intentions root framework "${intentions.framework}" does not match expected target "${expectedFramework}".`,
      span: rootSpan,
    });
  }

  // 2. Context validation driven by targetContextSchema
  if (isRecord(intentions.context)) {
    const context = intentions.context;
    const contextSpan = findActionableSpan(context) ?? rootSpan;
    const contextIssues = validateAgainstSchema(context, targetContextSchema, {
      basePath: "context",
      root: intentions,
      fallbackSpan: contextSpan,
    });
    issues.push(...contextIssues);

    // Cross-field: context framework vs intentions framework
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
  }

  // 3. Module validation driven by semanticModuleSchema
  if (isRecord(intentions.module)) {
    const module_ = intentions.module;
    const moduleSpan = findActionableSpan(module_) ?? rootSpan;
    const moduleIssues = validateAgainstSchema(module_, semanticModuleSchema, {
      basePath: "module",
      root: intentions,
      fallbackSpan: moduleSpan,
    });
    issues.push(...moduleIssues);

    // Cross-field: module moduleKind vs context moduleKind
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
  }

  // 4. Lowered validation driven by targetLoweredModuleSchema
  if (isRecord(intentions.lowered)) {
    const lowered = intentions.lowered;
    const loweredSpan = findActionableSpan(lowered) ?? rootSpan;
    const loweredIssues = validateAgainstSchema(
      lowered,
      targetLoweredModuleSchema,
      {
        basePath: "lowered",
        root: intentions,
        fallbackSpan: loweredSpan,
      },
    );
    issues.push(...loweredIssues);

    // Cross-field: lowered framework vs expected target framework and root framework
    if (
      typeof lowered.framework === "string" &&
      lowered.framework.length > 0
    ) {
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
  }

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

function pickPrimaryErrorMessage(errors: readonly string[]): string {
  if (errors.length === 0) {
    return "Target intentions validation failed.";
  }
  const notObject = errors.find((candidateError) =>
    candidateError.includes("must be an object"),
  );
  if (notObject !== undefined) {
    return notObject;
  }
  const missingLowered = errors.find((candidateError) =>
    candidateError.includes("must contain a lowered target plan"),
  );
  if (missingLowered !== undefined) {
    return missingLowered;
  }
  const emptyLoweredFw = errors.find((candidateError) =>
    candidateError.includes("non-empty framework discriminator"),
  );
  if (emptyLoweredFw !== undefined) {
    return emptyLoweredFw;
  }
  const loweredMismatch = errors.find((candidateError) =>
    candidateError.includes("lowered plan framework"),
  );
  if (loweredMismatch !== undefined) {
    return loweredMismatch;
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
