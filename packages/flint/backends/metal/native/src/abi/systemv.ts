/**
 * System V AMD64 and AArch64 ABI Calling Convention Definitions.
 */
export const SYSV_AMD64_ARG_REGISTERS = [
  "rdi",
  "rsi",
  "rdx",
  "rcx",
  "r8",
  "r9",
] as const;
export const SYSV_AMD64_RET_REGISTERS = ["rax", "rdx"] as const;
export const SYSV_AMD64_CALLEE_SAVED = [
  "rbx",
  "rsp",
  "rbp",
  "r12",
  "r13",
  "r14",
  "r15",
] as const;

export const SYSV_AARCH64_ARG_REGISTERS = [
  "x0",
  "x1",
  "x2",
  "x3",
  "x4",
  "x5",
  "x6",
  "x7",
] as const;
export const SYSV_AARCH64_RET_REGISTERS = ["x0", "x1"] as const;
export const SYSV_AARCH64_CALLEE_SAVED = [
  "x19",
  "x20",
  "x21",
  "x22",
  "x23",
  "x24",
  "x25",
  "x26",
  "x27",
  "x28",
  "fp",
  "lr",
] as const;

/**
 * Calculates stack frame size aligned to 16 bytes according to SysV ABI requirements.
 */
export function alignSysVStackFrame(bytes: number): number {
  return (bytes + 15) & ~15;
}
