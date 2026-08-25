import { FORGE_WEB_SCRIPT_ABI_VERSION, FORGE_WEB_SCRIPT_LANGUAGE_VERSION } from '@mission-platform/forge-web-script';

import { ForgeWebScriptTrap } from './traps.js';

import type {
  ForgeWebScriptAbiFunction,
  ForgeWebScriptAbiManifest,
  ForgeWebScriptPrimitiveType,
} from '@mission-platform/forge-web-script';

export interface ForgeWebScriptAbiValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

const primitiveTypes = new Set<ForgeWebScriptPrimitiveType>([
  'bool',
  'bytes',
  'f32',
  'f64',
  'i32',
  'i64',
  'string',
  'u32',
  'u64',
  'unit',
]);

function equalFunction(left: ForgeWebScriptAbiFunction, right: ForgeWebScriptAbiFunction): boolean {
  return (
    left.result === right.result &&
    left.resultReference === right.resultReference &&
    JSON.stringify(left.resultArguments) === JSON.stringify(right.resultArguments) &&
    left.parameters.length === right.parameters.length &&
    left.parameters.every((parameter, index) => {
      const other = right.parameters[index];
      return (
        parameter.type === other?.type &&
        parameter.reference === other.reference &&
        JSON.stringify(parameter.arguments) === JSON.stringify(other.arguments) &&
        parameter.length === other.length &&
        parameter.ownership === other.ownership &&
        parameter.passing === other.passing &&
        parameter.mutable === other.mutable &&
        parameter.referenceMode === other.referenceMode
      );
    })
  );
}

export function validateForgeWebScriptAbiManifest(
  manifest: ForgeWebScriptAbiManifest,
): ForgeWebScriptAbiValidationResult {
  const errors: string[] = [];
  if (manifest.format !== 'forge-web-script-module') errors.push('Unsupported manifest format.');
  if (manifest.languageVersion !== FORGE_WEB_SCRIPT_LANGUAGE_VERSION)
    errors.push(`Unsupported language version '${manifest.languageVersion}'.`);
  if (manifest.abiVersion !== FORGE_WEB_SCRIPT_ABI_VERSION)
    errors.push(`Unsupported ABI version '${manifest.abiVersion}'.`);
  if (manifest.memory.pageSize !== 65_536 || manifest.memory.addressType !== 'u32')
    errors.push('Unsupported linear memory layout.');
  if (
    manifest.memory.allocatorExport !== 'fws_alloc' ||
    manifest.memory.deallocatorExport !== 'fws_dealloc' ||
    manifest.memory.reallocatorExport !== 'fws_realloc'
  )
    errors.push('Allocator exports do not match the v1.2 ABI.');
  const names = new Set<string>();
  for (const declaration of [...manifest.exports, ...manifest.imports.map((entry) => entry.function)]) {
    if (names.has(declaration.name)) errors.push(`Duplicate ABI function '${declaration.name}'.`);
    names.add(declaration.name);
    for (const parameter of declaration.parameters) {
      if (!primitiveTypes.has(parameter.type)) errors.push(`Unknown ABI parameter type '${parameter.type}'.`);
      if (parameter.reference === 'Array') {
        if (parameter.type !== 'i32') errors.push(`Unsupported Array carrier type '${parameter.type}'.`);
        if (parameter.arguments?.length !== 1 || parameter.arguments[0]?.name !== 'i32')
          errors.push('Unsupported collection element type; only Array<i32> is supported.');
        if (parameter.ownership !== undefined && parameter.ownership !== 'owned')
          errors.push('Array<i32> ABI parameters must be owned.');
      }
      if (parameter.passing === 'mutable-reference' && parameter.referenceMode !== 'mut-ref')
        errors.push(`Mutable ABI parameter '${parameter.name}' must use an explicit &mut reference.`);
      if (parameter.passing === 'immutable-reference' && parameter.referenceMode === 'mut-ref')
        errors.push(`Mutable reference ABI parameter '${parameter.name}' cannot be immutable.`);
    }
    if (!primitiveTypes.has(declaration.result)) errors.push(`Unknown ABI result type '${declaration.result}'.`);
    if (declaration.resultReference === 'Array') {
      if (declaration.result !== 'i32') errors.push(`Unsupported Array carrier type '${declaration.result}'.`);
      if (declaration.resultArguments?.length !== 1 || declaration.resultArguments[0]?.name !== 'i32')
        errors.push('Unsupported collection element type; only Array<i32> is supported.');
    }
  }
  if (manifest.memory.safetyModel !== undefined && manifest.memory.safetyModel !== 'region-arc-checked-linear')
    errors.push('Unsupported memory safety model.');
  const capabilities = [...manifest.requiredCapabilities].toSorted();
  if (JSON.stringify(capabilities) !== JSON.stringify(manifest.requiredCapabilities))
    errors.push('Required capabilities must be sorted.');
  if (new Set(manifest.requiredCapabilities).size !== manifest.requiredCapabilities.length)
    errors.push('Required capabilities must be unique.');
  for (const imported of manifest.imports)
    if (!manifest.requiredCapabilities.includes(imported.capability))
      errors.push(`Import '${imported.alias}' is missing from requiredCapabilities.`);
  return { valid: errors.length === 0, errors };
}

export function assertValidForgeWebScriptAbiManifest(manifest: ForgeWebScriptAbiManifest): void {
  const result = validateForgeWebScriptAbiManifest(manifest);
  if (!result.valid) throw new ForgeWebScriptTrap('InvalidAbi', result.errors.join(' '));
}

export { equalFunction };
