// Canonical subpackage exports
export * as flintAst from '@mission-platform/flint-ast';
export * as flintParser from '@mission-platform/flint-parser';
export * as flintTypes from '@mission-platform/flint-types';
export * as flintAnalysis from '@mission-platform/flint-analysis';
export * as flintMacro from '@mission-platform/flint-macro';
export * as flintSonir from '@mission-platform/flint-sonir';
export * as flintMachir from '@mission-platform/flint-machir';
export * as flintBackendWebWasm from '@mission-platform/flint-backend-web-wasm';
export * as flintBackendMetalArm from '@mission-platform/flint-backend-metal-arm';
export * as flintBackendMetalNative from '@mission-platform/flint-backend-metal-native';
export * as flintLinker from '@mission-platform/flint-linker';
export * as flintCAbi from '@mission-platform/flint-c-abi';

// ABI manifest constants & types
export {
  FLINT_ABI_VERSION,
  FLINT_LANGUAGE_VERSION,
  type FlintAbiManifest,
  type FlintAbiFunction,
  type FlintAbiParameter,
  type FlintLinkMode,
  type FlintLinkProfile,
  type FlintLinkOptimizationProfile,
} from '@mission-platform/flint-c-abi';

export {
  type FlintOwnership,
  type FlintPrimitiveType,
  type FlintToken,
  type FlintTokenKind,
} from '@mission-platform/flint-ast';

export {
  type FlintSoNBoundsChecks,
  type FlintSoNModule,
  type FlintSoNOptimizationReport,
  deserializeFlintSoN,
  serializeFlintSoN,
} from '@mission-platform/flint-sonir';

export {
  formatFlintSarif,
  createFlintAbiManifest,
  analyzeFlint,
  createFlintAnalysisPolicy,
  type FlintAnalysisOptions,
} from '@mission-platform/flint-analysis';
export { parseFlint, lexFlint } from '@mission-platform/flint-parser';
export { checkFlint } from '@mission-platform/flint-types';

// Direct backend and MachIR exports
export {
  type MachRegister,
  type MachOpcode,
  type MachInstruction,
  type MachBasicBlock,
  type MachFunction,
  type MachModule,
  type TargetBackend,
  LinearScanRegisterAllocator,
  GraphColoringRegisterAllocator,
  MachIrOptimizer,
  lowerLowLevelSonToMachIr,
} from '@mission-platform/flint-machir';

export {
  WasmTargetBackend,
  createWasmTargetBackend,
  encodeV128Const,
  SIMD_OPCODES,
  WASM_SIMD_PREFIX,
  type WasmEmissionOptions,
  type WasmEmissionResult,
  type WasmMemoryBank,
  type WasmMultiMemoryConfig,
} from '@mission-platform/flint-backend-web-wasm';

export {
  ArmTargetBackend,
  createArmTargetBackend,
  STM32F4_PERIPHERALS,
  generateArmVectorTableAssembly,
  emitMmioAccessThumb2,
  type ArmEmissionOptions,
  type PeripheralBlock,
  type InterruptVectorEntry,
  type InterruptVectorTable,
  type MmioRegisterAccess,
} from '@mission-platform/flint-backend-metal-arm';

export {
  AArch64TargetBackend,
  Amd64TargetBackend,
  createAArch64TargetBackend,
  createAmd64TargetBackend,
  createElf64Header,
  alignSysVStackFrame,
  alignWin64StackFrame,
  SYSV_AMD64_ARG_REGISTERS,
  SYSV_AMD64_RET_REGISTERS,
  SYSV_AMD64_CALLEE_SAVED,
  SYSV_AARCH64_ARG_REGISTERS,
  SYSV_AARCH64_RET_REGISTERS,
  SYSV_AARCH64_CALLEE_SAVED,
  WIN64_ARG_REGISTERS,
  WIN64_RET_REGISTERS,
  WIN64_CALLEE_SAVED,
  type AArch64EmissionOptions,
  type Amd64EmissionOptions,
  type ElfSection,
} from '@mission-platform/flint-backend-metal-native';

// Compiler pipeline, frontend, services, diagnostics, and coordinator
export * from './cache.js';
export * from './contracts.js';
export * from './compiler.js';
export * from './diagnostics.js';
export * from './documentation.js';
export * from './dynamic-links.js';
export * from './graph.js';
export * from './identity.js';
export * from './module-types.js';
export * from './frontend.js';
export * from './validate.js';
export * from './safety.js';
export * from './self-hosted.js';
export * from './graph-compiler';
