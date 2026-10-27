/**
 * Entry in the static ARM Cortex-M Interrupt Vector Table (IVT).
 */
export interface InterruptVectorEntry {
  readonly vectorNumber: number;
  readonly handlerSymbol: string;
  readonly priority: number;
  readonly stackPointer: "main" | "process";
}

export interface InterruptVectorTable {
  readonly initialStackPointer: number;
  readonly resetHandler: string;
  readonly nmiHandler: string;
  readonly hardFaultHandler: string;
  readonly memManageHandler?: string;
  readonly busFaultHandler?: string;
  readonly usageFaultHandler?: string;
  readonly sysTickHandler?: string;
  readonly externalInterrupts: readonly InterruptVectorEntry[];
}

/**
 * Generates assembly source text for the ARM Cortex-M Vector Table.
 */
export function generateArmVectorTableAssembly(
  ivt: InterruptVectorTable,
): string {
  const lines: string[] = [
    "  .syntax unified",
    "  .cpu cortex-m4",
    "  .thumb",
    "",
    '  .section .vectors, "a", %progbits',
    "  .type g_pfnVectors, %object",
    "  .size g_pfnVectors, .-g_pfnVectors",
    "g_pfnVectors:",
    `  .word 0x${ivt.initialStackPointer.toString(16).padStart(8, "0")}`,
    `  .word ${ivt.resetHandler}`,
    `  .word ${ivt.nmiHandler}`,
    `  .word ${ivt.hardFaultHandler}`,
    `  .word ${ivt.memManageHandler ?? "Default_Handler"}`,
    `  .word ${ivt.busFaultHandler ?? "Default_Handler"}`,
    `  .word ${ivt.usageFaultHandler ?? "Default_Handler"}`,
    "  .word 0",
    "  .word 0",
    "  .word 0",
    "  .word 0",
    "  .word Default_Handler",
    "  .word Default_Handler",
    "  .word 0",
    "  .word Default_Handler",
    `  .word ${ivt.sysTickHandler ?? "SysTick_Handler"}`,
  ];

  for (const entry of ivt.externalInterrupts) {
    lines.push(
      `  .word ${entry.handlerSymbol} /* IRQ ${entry.vectorNumber} */`,
    );
  }

  return lines.join("\n");
}
