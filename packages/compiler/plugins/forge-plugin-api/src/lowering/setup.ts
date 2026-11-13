import {
  createCompilerDiagnostic,
  type CompilerDiagnostic,
} from "../diagnostics.js";

import type { SemanticModule, SetupContract } from "../ir.js";

/** Empty setup contract used by legacy-free composable modules without a setup. */
export const EMPTY_SETUP_CONTRACT: SetupContract = {
  setupName: "setup",
  parameters: [],
  properties: [],
  computedValues: [],
  handlers: [],
  emitters: [],
  models: [],
  templateReferences: [],
  styleReferences: [],
};

/** Gets the canonical setup contract attached by the frontend. */
export function normalizeSetupContract(module: SemanticModule): SetupContract {
  return module.setupContract ?? EMPTY_SETUP_CONTRACT;
}

/**
 * Validates setup dependencies, names, and model payload compatibility before target lowering.
 */
export function validateSetupContract(
  contract: SetupContract,
  fileName = "<unknown>",
): readonly CompilerDiagnostic[] {
  const diagnostics: CompilerDiagnostic[] = [];
  const knownNames = new Set<string>([
    ...contract.properties.map(({ name }) => name),
    ...contract.computedValues.map(({ name }) => name),
  ]);
  const computedNames = new Set(
    contract.computedValues.map(({ name }) => name),
  );
  const seenNames = new Set<string>();

  for (const property of contract.properties) {
    if (seenNames.has(property.name)) {
      diagnostics.push(
        createCompilerDiagnostic({
          phase: "ir",
          severity: "error",
          code: "FORGE-SETUP-001",
          message: `Reactive property '${property.name}' is declared more than once.`,
          fileName,
          span: property.span,
        }),
      );
    }
    seenNames.add(property.name);
  }

  for (const value of contract.computedValues) {
    if (seenNames.has(value.name)) {
      diagnostics.push(
        createCompilerDiagnostic({
          phase: "ir",
          severity: "error",
          code: "FORGE-SETUP-002",
          message: `Setup value '${value.name}' collides with another setup binding.`,
          fileName,
          span: value.span,
        }),
      );
    }
    seenNames.add(value.name);
    for (const dependency of value.dependencies) {
      if (!knownNames.has(dependency)) {
        diagnostics.push(
          createCompilerDiagnostic({
            phase: "ir",
            severity: "error",
            code: "FORGE-SETUP-003",
            message: `Setup value '${value.name}' depends on unknown name '${dependency}'.`,
            fileName,
            span: value.span,
          }),
        );
      }
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const computedByName = new Map(
    contract.computedValues.map((value) => [value.name, value]),
  );
  const visit = (name: string): void => {
    if (visited.has(name) || !computedNames.has(name)) return;
    const value = computedByName.get(name);
    if (value === undefined) return;
    if (visiting.has(name)) {
      diagnostics.push(
        createCompilerDiagnostic({
          phase: "ir",
          severity: "error",
          code: "FORGE-SETUP-004",
          message: `Computed setup values contain a dependency cycle at '${name}'.`,
          fileName,
          span: value.span,
        }),
      );
      return;
    }
    visiting.add(name);
    for (const dependency of value.dependencies) visit(dependency);
    visiting.delete(name);
    visited.add(name);
  };
  for (const value of contract.computedValues) visit(value.name);

  for (const model of contract.models) {
    if (model.updatePayloadType !== model.typeText) {
      diagnostics.push(
        createCompilerDiagnostic({
          phase: "ir",
          severity: "error",
          code: "FORGE-SETUP-005",
          message: `Model update event '${model.updateEventName}' has payload type '${model.updatePayloadType}', expected '${model.typeText}'.`,
          fileName,
          span: model.span,
        }),
      );
    }
  }
  return diagnostics;
}
