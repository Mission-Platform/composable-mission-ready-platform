import { describe, expect, it } from "vitest";

import type { MachModule } from "@mission-platform/flint-machir";

import {
  createArmTargetBackend,
  emitMmioAccessThumb2,
  STM32F4_PERIPHERALS,
} from ".";

describe("Flint Metal Backend (ARMv7-M / STM32)", () => {
  it("generates valid Thumb-2 assembly with vector table and function prologue/epilogue", () => {
    const machModule: MachModule = {
      name: "stm32_blink",
      functions: [
        {
          name: "main",
          stackFrameSize: 16,
          callingConvention: "arm_aapcs",
          isInterruptHandler: false,
          blocks: [
            {
              id: 1,
              label: "entry",
              predecessors: [],
              successors: [],
              instructions: [
                {
                  id: 1,
                  opcode: "mov",
                  defs: [{ id: 0, isVirtual: false, assignedHardwareIndex: 0 }],
                  uses: [],
                  immediate: 42,
                },
                {
                  id: 2,
                  opcode: "ret",
                  defs: [],
                  uses: [{ id: 0, isVirtual: false, assignedHardwareIndex: 0 }],
                },
              ],
            },
          ],
        },
      ],
    };

    const backend = createArmTargetBackend();
    const asm = backend.emit(machModule, {
      ivt: {
        initialStackPointer: 0x2002_0000,
        resetHandler: "main",
        nmiHandler: "Default_Handler",
        hardFaultHandler: "HardFault_Handler",
        externalInterrupts: [],
      },
    });

    expect(asm).toContain(".syntax unified");
    expect(asm).toContain(".thumb");
    expect(asm).toContain("g_pfnVectors:");
    expect(asm).toContain("push {r4-r7, lr}");
    expect(asm).toContain("movs r0, #42");
    expect(asm).toContain("pop {r4-r7, pc}");
  });

  it("generates MMIO access instructions for STM32 GPIO registers", () => {
    const gpioA = STM32F4_PERIPHERALS.GPIOA!;
    const accessLines = emitMmioAccessThumb2(
      {
        peripheral: "GPIOA",
        register: "BSRR",
        absoluteAddress: gpioA.baseAddress + gpioA.registers.BSRR!,
        accessType: "write",
        bitWidth: 32,
      },
      "r1",
    );

    expect(accessLines.join("\n")).toContain("0x40020018");
    expect(accessLines.join("\n")).toContain("str r1, [r3]");
    expect(accessLines.join("\n")).toContain("dmb");
  });
});
