/**
 * Microsoft x64 ABI Calling Convention Definitions.
 */
export const WIN64_ARG_REGISTERS = ["rcx", "rdx", "r8", "r9"] as const;
export const WIN64_RET_REGISTERS = ["rax"] as const;
export const WIN64_CALLEE_SAVED = [
  "rbx",
  "rbp",
  "rdi",
  "rsi",
  "r12",
  "r13",
  "r14",
  "r15",
] as const;

export const WIN64_SHADOW_SPACE_BYTES = 32;

/**
 * Calculates stack frame size including 32-byte shadow space and 16-byte alignment.
 */
export function alignWin64StackFrame(localBytes: number): number {
  const total = localBytes + WIN64_SHADOW_SPACE_BYTES;
  return (total + 15) & ~15;
}
