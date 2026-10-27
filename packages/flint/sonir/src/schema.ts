import type { FlintSoNModule } from "./son-ir.js";

export const FLINT_SON_SCHEMA_URI =
  "https://json-schema.org/draft/2020-12/schema";

/**
 * Formal JSON Schema definition (Draft 2020-12) for FlintSoNModule Sea-of-Nodes intermediate representation.
 */
export const FLINT_SON_JSON_SCHEMA = {
  $schema: FLINT_SON_SCHEMA_URI,
  $id: "https://flint.dev/schemas/sonir-module.v1.json",
  title: "FlintSoNModule",
  description:
    "Schema definition for serialized Flint Sea-of-Nodes intermediate representation modules.",
  type: "object",
  required: [
    "schemaVersion",
    "compilerVersion",
    "languageVersion",
    "abiVersion",
    "sourceHash",
    "graphHash",
    "optimization",
    "boundsChecks",
    "memoryModel",
    "functions",
    "nodes",
    "regions",
    "sourceMap",
  ],
  additionalProperties: false,
  properties: {
    schemaVersion: {
      type: "string",
      const: "1.0",
    },
    compilerVersion: {
      type: "string",
    },
    languageVersion: {
      type: "string",
    },
    abiVersion: {
      type: "string",
    },
    sourceHash: {
      type: "string",
      pattern: "^[0-9a-fA-F]{8,64}$",
    },
    graphHash: {
      type: "string",
      pattern: "^[0-9a-fA-F]{8,64}$",
    },
    optimization: {
      type: "string",
      enum: ["debug", "release"],
    },
    boundsChecks: {
      type: "string",
      enum: ["runtime", "proven-safe", "excluded-by-profile"],
    },
    memoryModel: {
      type: "string",
      const: "region-arc-checked-linear",
    },
    functions: {
      type: "array",
      items: {
        $ref: "#/$defs/FlintSoNFunction",
      },
    },
    nodes: {
      type: "array",
      items: {
        $ref: "#/$defs/FlintSoNNode",
      },
    },
    regions: {
      type: "array",
      items: {
        $ref: "#/$defs/FlintSoNControlRegion",
      },
    },
    sourceMap: {
      type: "array",
      items: {
        $ref: "#/$defs/FlintSoNSourceMapEntry",
      },
    },
    optimizationReport: {
      $ref: "#/$defs/FlintSoNOptimizationReport",
    },
  },
  $defs: {
    FlintSourceSpan: {
      type: "object",
      required: ["start", "end", "line", "column", "endLine", "endColumn"],
      additionalProperties: false,
      properties: {
        start: { type: "integer", minimum: 0 },
        end: { type: "integer", minimum: 0 },
        line: { type: "integer", minimum: 1 },
        column: { type: "integer", minimum: 1 },
        endLine: { type: "integer", minimum: 1 },
        endColumn: { type: "integer", minimum: 1 },
      },
    },
    FlintSoNFunction: {
      type: "object",
      required: ["name", "entry", "exported"],
      additionalProperties: false,
      properties: {
        name: { type: "string" },
        entry: { type: "integer", minimum: 0 },
        exported: { type: "boolean" },
      },
    },
    FlintSoNEffect: {
      type: "string",
      enum: [
        "pure",
        "read",
        "write",
        "call",
        "control",
        "allocation",
        "unknown",
      ],
    },
    FlintSoNAliasFact: {
      type: "string",
      enum: ["none", "local", "borrowed", "mutable", "unknown"],
    },
    FlintSoNOwnershipFact: {
      type: "string",
      enum: ["value", "borrowed", "owned", "shared", "unknown"],
    },
    FlintSoNNode: {
      type: "object",
      required: [
        "id",
        "kind",
        "functionName",
        "inputs",
        "effects",
        "alias",
        "ownership",
      ],
      additionalProperties: false,
      properties: {
        id: { type: "integer", minimum: 0 },
        kind: { type: "string" },
        functionName: { type: "string" },
        inputs: {
          type: "array",
          items: { type: "integer", minimum: 0 },
        },
        effects: {
          type: "array",
          items: { $ref: "#/$defs/FlintSoNEffect" },
        },
        alias: { $ref: "#/$defs/FlintSoNAliasFact" },
        ownership: { $ref: "#/$defs/FlintSoNOwnershipFact" },
        type: { type: "string" },
        value: {
          type: ["boolean", "number", "string"],
        },
        callee: { type: "string" },
        span: { $ref: "#/$defs/FlintSourceSpan" },
      },
    },
    FlintSoNControlRegion: {
      type: "object",
      required: ["id", "functionName", "kind", "nodes"],
      additionalProperties: false,
      properties: {
        id: { type: "integer", minimum: 0 },
        functionName: { type: "string" },
        kind: {
          type: "string",
          enum: ["function", "block", "branch", "loop", "switch"],
        },
        parent: { type: "integer", minimum: 0 },
        nodes: {
          type: "array",
          items: { type: "integer", minimum: 0 },
        },
      },
    },
    FlintSoNSourceMapEntry: {
      type: "object",
      required: ["node", "span"],
      additionalProperties: false,
      properties: {
        node: { type: "integer", minimum: 0 },
        span: { $ref: "#/$defs/FlintSourceSpan" },
      },
    },
    FlintSoNPassReport: {
      type: "object",
      required: ["name", "applied", "skipped"],
      additionalProperties: false,
      properties: {
        name: {
          type: "string",
          enum: [
            "constant-propagation",
            "copy-propagation",
            "global-value-numbering",
            "cfg-simplification",
            "dead-node-elimination",
            "reachability-pruning",
            "purity-analysis",
            "inlining",
            "escape-analysis",
            "switch-density",
            "bounds-proof",
          ],
        },
        applied: { type: "integer", minimum: 0 },
        skipped: { type: "integer", minimum: 0 },
        reason: { type: "string" },
      },
    },
    FlintSoNOptimizationReport: {
      type: "object",
      required: [
        "mode",
        "passes",
        "nodesBefore",
        "nodesAfter",
        "graphHashBefore",
        "graphHashAfter",
      ],
      additionalProperties: false,
      properties: {
        mode: {
          type: "string",
          enum: ["debug", "release"],
        },
        passes: {
          type: "array",
          items: { $ref: "#/$defs/FlintSoNPassReport" },
        },
        nodesBefore: { type: "integer", minimum: 0 },
        nodesAfter: { type: "integer", minimum: 0 },
        graphHashBefore: { type: "string", pattern: "^[0-9a-fA-F]{8,64}$" },
        graphHashAfter: { type: "string", pattern: "^[0-9a-fA-F]{8,64}$" },
      },
    },
  },
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isSourceSpan(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    isNonNegativeInteger(value.start) &&
    isNonNegativeInteger(value.end) &&
    typeof value.line === "number" &&
    Number.isInteger(value.line) &&
    value.line >= 1 &&
    typeof value.column === "number" &&
    Number.isInteger(value.column) &&
    value.column >= 1 &&
    typeof value.endLine === "number" &&
    Number.isInteger(value.endLine) &&
    value.endLine >= 1 &&
    typeof value.endColumn === "number" &&
    Number.isInteger(value.endColumn) &&
    value.endColumn >= 1
  );
}

function validateObjectKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
  errors: string[],
): void {
  const allowedKeys = new Set(allowed);
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key))
      errors.push(`${path} contains unexpected property '${key}'.`);
  }
}

function validateSpan(value: unknown, path: string, errors: string[]): void {
  if (!isSourceSpan(value)) errors.push(`Invalid '${path}' source span.`);
}

function validateFunctions(value: unknown, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push("Missing or invalid 'functions' array.");
    return;
  }
  for (const [index, entry] of value.entries()) {
    const path = `functions[${index}]`;
    if (!isRecord(entry)) {
      errors.push(`Invalid '${path}' record.`);
      continue;
    }
    validateObjectKeys(entry, ["name", "entry", "exported"], path, errors);
    if (typeof entry.name !== "string") errors.push(`Invalid '${path}.name'.`);
    if (!isNonNegativeInteger(entry.entry))
      errors.push(`Invalid '${path}.entry'.`);
    if (typeof entry.exported !== "boolean")
      errors.push(`Invalid '${path}.exported'.`);
  }
}

function validateNodes(value: unknown, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push("Missing or invalid 'nodes' array.");
    return;
  }
  const effects = new Set([
    "pure",
    "read",
    "write",
    "call",
    "control",
    "allocation",
    "unknown",
  ]);
  const aliases = new Set(["none", "local", "borrowed", "mutable", "unknown"]);
  const ownership = new Set([
    "value",
    "borrowed",
    "owned",
    "shared",
    "unknown",
  ]);
  for (const [index, entry] of value.entries()) {
    const path = `nodes[${index}]`;
    if (!isRecord(entry)) {
      errors.push(`Invalid '${path}' record.`);
      continue;
    }
    validateObjectKeys(
      entry,
      [
        "id",
        "kind",
        "functionName",
        "inputs",
        "effects",
        "alias",
        "ownership",
        "type",
        "value",
        "callee",
        "span",
      ],
      path,
      errors,
    );
    if (!isNonNegativeInteger(entry.id)) errors.push(`Invalid '${path}.id'.`);
    if (typeof entry.kind !== "string") errors.push(`Invalid '${path}.kind'.`);
    if (typeof entry.functionName !== "string")
      errors.push(`Invalid '${path}.functionName'.`);
    if (
      !Array.isArray(entry.inputs) ||
      !entry.inputs.every(isNonNegativeInteger)
    )
      errors.push(`Invalid '${path}.inputs' array.`);
    if (
      !Array.isArray(entry.effects) ||
      !entry.effects.every(
        (effect) => typeof effect === "string" && effects.has(effect),
      )
    )
      errors.push(`Invalid '${path}.effects' array.`);
    if (typeof entry.alias !== "string" || !aliases.has(entry.alias))
      errors.push(`Invalid '${path}.alias'.`);
    if (typeof entry.ownership !== "string" || !ownership.has(entry.ownership))
      errors.push(`Invalid '${path}.ownership'.`);
    if (entry.type !== undefined && typeof entry.type !== "string")
      errors.push(`Invalid '${path}.type'.`);
    if (
      entry.value !== undefined &&
      !(
        typeof entry.value === "boolean" ||
        (typeof entry.value === "number" && Number.isFinite(entry.value)) ||
        typeof entry.value === "string"
      )
    )
      errors.push(`Invalid '${path}.value'.`);
    if (entry.callee !== undefined && typeof entry.callee !== "string")
      errors.push(`Invalid '${path}.callee'.`);
    if (entry.span !== undefined)
      validateSpan(entry.span, `${path}.span`, errors);
  }
}

function validateRegions(value: unknown, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push("Missing or invalid 'regions' array.");
    return;
  }
  const kinds = new Set(["function", "block", "branch", "loop", "switch"]);
  for (const [index, entry] of value.entries()) {
    const path = `regions[${index}]`;
    if (!isRecord(entry)) {
      errors.push(`Invalid '${path}' record.`);
      continue;
    }
    validateObjectKeys(
      entry,
      ["id", "functionName", "kind", "parent", "nodes"],
      path,
      errors,
    );
    if (!isNonNegativeInteger(entry.id)) errors.push(`Invalid '${path}.id'.`);
    if (typeof entry.functionName !== "string")
      errors.push(`Invalid '${path}.functionName'.`);
    if (typeof entry.kind !== "string" || !kinds.has(entry.kind))
      errors.push(`Invalid '${path}.kind'.`);
    if (entry.parent !== undefined && !isNonNegativeInteger(entry.parent))
      errors.push(`Invalid '${path}.parent'.`);
    if (!Array.isArray(entry.nodes) || !entry.nodes.every(isNonNegativeInteger))
      errors.push(`Invalid '${path}.nodes' array.`);
  }
}

function validateSourceMap(value: unknown, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push("Missing or invalid 'sourceMap' array.");
    return;
  }
  for (const [index, entry] of value.entries()) {
    const path = `sourceMap[${index}]`;
    if (!isRecord(entry)) {
      errors.push(`Invalid '${path}' record.`);
      continue;
    }
    validateObjectKeys(entry, ["node", "span"], path, errors);
    if (!isNonNegativeInteger(entry.node))
      errors.push(`Invalid '${path}.node'.`);
    validateSpan(entry.span, `${path}.span`, errors);
  }
}

function validateOptimizationReport(value: unknown, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push("Invalid 'optimizationReport' record.");
    return;
  }
  validateObjectKeys(
    value,
    [
      "mode",
      "passes",
      "nodesBefore",
      "nodesAfter",
      "graphHashBefore",
      "graphHashAfter",
    ],
    "optimizationReport",
    errors,
  );
  if (value.mode !== "debug" && value.mode !== "release")
    errors.push("Invalid 'optimizationReport.mode'.");
  if (!Array.isArray(value.passes)) {
    errors.push("Invalid 'optimizationReport.passes' array.");
  } else {
    const passNames = new Set([
      "constant-propagation",
      "copy-propagation",
      "global-value-numbering",
      "cfg-simplification",
      "dead-node-elimination",
      "reachability-pruning",
      "purity-analysis",
      "inlining",
      "escape-analysis",
      "switch-density",
      "bounds-proof",
    ]);
    for (const [index, pass] of value.passes.entries()) {
      const path = `optimizationReport.passes[${index}]`;
      if (!isRecord(pass)) {
        errors.push(`Invalid '${path}' record.`);
        continue;
      }
      validateObjectKeys(
        pass,
        ["name", "applied", "skipped", "reason"],
        path,
        errors,
      );
      if (typeof pass.name !== "string" || !passNames.has(pass.name))
        errors.push(`Invalid '${path}.name'.`);
      if (!isNonNegativeInteger(pass.applied))
        errors.push(`Invalid '${path}.applied'.`);
      if (!isNonNegativeInteger(pass.skipped))
        errors.push(`Invalid '${path}.skipped'.`);
      if (pass.reason !== undefined && typeof pass.reason !== "string")
        errors.push(`Invalid '${path}.reason'.`);
    }
  }
  if (!isNonNegativeInteger(value.nodesBefore))
    errors.push("Invalid 'optimizationReport.nodesBefore'.");
  if (!isNonNegativeInteger(value.nodesAfter))
    errors.push("Invalid 'optimizationReport.nodesAfter'.");
  if (
    typeof value.graphHashBefore !== "string" ||
    !/^[0-9a-fA-F]{8,64}$/.test(value.graphHashBefore)
  )
    errors.push("Invalid 'optimizationReport.graphHashBefore'.");
  if (
    typeof value.graphHashAfter !== "string" ||
    !/^[0-9a-fA-F]{8,64}$/.test(value.graphHashAfter)
  )
    errors.push("Invalid 'optimizationReport.graphHashAfter'.");
}

/**
 * Structural validator for Sea-of-Nodes JSON artifacts according to SonIR specs.
 */
export function validateFlintSonIrSchema(candidate: unknown): {
  readonly valid: boolean;
  readonly errors: readonly string[];
} {
  if (!isRecord(candidate)) {
    return {
      valid: false,
      errors: ["Expected an object representing a Flint SoN module."],
    };
  }
  const errors: string[] = [];

  validateObjectKeys(
    candidate,
    [
      "schemaVersion",
      "compilerVersion",
      "languageVersion",
      "abiVersion",
      "sourceHash",
      "graphHash",
      "optimization",
      "boundsChecks",
      "memoryModel",
      "functions",
      "nodes",
      "regions",
      "sourceMap",
      "optimizationReport",
    ],
    "module",
    errors,
  );
  if (candidate.schemaVersion !== "1.0")
    errors.push("Missing or invalid 'schemaVersion'.");
  if (typeof candidate.compilerVersion !== "string")
    errors.push("Missing or invalid 'compilerVersion'.");
  if (typeof candidate.languageVersion !== "string")
    errors.push("Missing or invalid 'languageVersion'.");
  if (typeof candidate.abiVersion !== "string")
    errors.push("Missing or invalid 'abiVersion'.");
  if (
    typeof candidate.sourceHash !== "string" ||
    !/^[0-9a-fA-F]{8,64}$/.test(candidate.sourceHash)
  )
    errors.push("Missing or invalid 'sourceHash'.");
  if (
    typeof candidate.graphHash !== "string" ||
    !/^[0-9a-fA-F]{8,64}$/.test(candidate.graphHash)
  )
    errors.push("Missing or invalid 'graphHash'.");
  if (
    candidate.optimization !== "debug" &&
    candidate.optimization !== "release"
  )
    errors.push("Invalid 'optimization' enum value.");
  if (
    candidate.boundsChecks !== "runtime" &&
    candidate.boundsChecks !== "proven-safe" &&
    candidate.boundsChecks !== "excluded-by-profile"
  )
    errors.push("Invalid 'boundsChecks' enum value.");
  if (candidate.memoryModel !== "region-arc-checked-linear")
    errors.push("Missing or invalid 'memoryModel'.");
  validateFunctions(candidate.functions, errors);
  validateNodes(candidate.nodes, errors);
  validateRegions(candidate.regions, errors);
  validateSourceMap(candidate.sourceMap, errors);
  if (candidate.optimizationReport !== undefined)
    validateOptimizationReport(candidate.optimizationReport, errors);

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Checks whether an object satisfies the full FlintSoNModule shape.
 */
export function isFlintSoNModule(value: unknown): value is FlintSoNModule {
  return validateFlintSonIrSchema(value).valid;
}
