/**
 * Safe abstraction for Memory-Mapped I/O (MMIO) register accesses.
 */
export interface MmioRegisterAccess {
  readonly peripheral: string;
  readonly register: string;
  readonly absoluteAddress: number;
  readonly accessType: "read" | "write" | "modify";
  readonly bitWidth: 8 | 16 | 32;
}

/**
 * Generates volatile Thumb-2 assembly instructions for reading or writing an MMIO register.
 */
export function emitMmioAccessThumb2(
  access: MmioRegisterAccess,
  dataRegister: string,
  scratchRegister = "r3",
): string[] {
  const addrHex = `0x${access.absoluteAddress.toString(16).padStart(8, "0")}`;
  const lines: string[] = [
    `  ldr ${scratchRegister}, =${addrHex} /* MMIO ${access.peripheral}->${access.register} */`,
  ];

  if (access.accessType === "read") {
    lines.push(`  ldr ${dataRegister}, [${scratchRegister}]`);
  } else if (access.accessType === "write") {
    lines.push(`  str ${dataRegister}, [${scratchRegister}]`);
    lines.push("  dmb /* Memory barrier */");
  }

  return lines;
}
