import type {
  MachFunction,
  MachInstruction,
  MachModule,
  TargetBackend,
} from "@mission-platform/flint-machir";

import {
  generateArmVectorTableAssembly,
  type InterruptVectorTable,
} from "./ivt.js";

export interface ArmEmissionOptions {
  readonly ivt?: InterruptVectorTable;
  readonly targetCpu?: "cortex-m0" | "cortex-m3" | "cortex-m4" | "cortex-m7";
}

/**
 * ARMv7-M (Thumb-2) Target Backend for STM32 and Cortex-M bare-metal systems.
 */
export class ArmTargetBackend implements TargetBackend<
  ArmEmissionOptions,
  string
> {
  public readonly targetName = "arm";
  public readonly targetCategory = "metal" as const;
  public readonly architecture = "armv7-m" as const;

  public emit(
    machModule: MachModule,
    options: ArmEmissionOptions = {},
  ): string {
    const lines: string[] = [
      "  .syntax unified",
      `  .cpu ${options.targetCpu ?? "cortex-m4"}`,
      "  .thumb",
      "  .text",
      "",
    ];

    if (options.ivt !== undefined) {
      lines.push(generateArmVectorTableAssembly(options.ivt));
      lines.push("");
      lines.push("  .text");
    }

    for (const fn of machModule.functions) {
      lines.push(...this.emitFunction(fn));
      lines.push("");
    }

    return lines.join("\n");
  }

  private emitFunction(fn: MachFunction): string[] {
    const lines: string[] = [
      `  .global ${fn.name}`,
      `  .type ${fn.name}, %function`,
      `  .thumb_func`,
      `${fn.name}:`,
      "  push {r4-r7, lr} /* Save callee-saved registers */",
    ];

    if (fn.stackFrameSize > 0) {
      lines.push(
        `  sub sp, sp, #${fn.stackFrameSize} /* Allocate stack frame */`,
      );
    }

    for (const block of fn.blocks) {
      if (block.label !== "entry") {
        lines.push(`.${fn.name}_${block.label}:`);
      }
      for (const ins of block.instructions) {
        lines.push(...this.emitInstruction(ins));
      }
    }

    if (fn.stackFrameSize > 0) {
      lines.push(
        `  add sp, sp, #${fn.stackFrameSize} /* Deallocate stack frame */`,
      );
    }

    lines.push("  pop {r4-r7, pc} /* Return */");
    lines.push(`  .size ${fn.name}, .-${fn.name}`);
    return lines;
  }

  private regName(regIndex?: number): string {
    if (regIndex === undefined) return "r0";
    return `r${regIndex}`;
  }

  private emitInstruction(ins: MachInstruction): string[] {
    const lines: string[] = [];
    const dst = this.regName(ins.defs[0]?.assignedHardwareIndex);
    const src1 = this.regName(ins.uses[0]?.assignedHardwareIndex);
    const src2 = this.regName(ins.uses[1]?.assignedHardwareIndex);

    switch (ins.opcode) {
      case "mov":
        if (ins.immediate !== undefined) {
          lines.push(`  movs ${dst}, #${ins.immediate}`);
        } else {
          lines.push(`  mov ${dst}, ${src1}`);
        }
        break;
      case "add":
        lines.push(`  adds ${dst}, ${src1}, ${src2}`);
        break;
      case "sub":
        lines.push(`  subs ${dst}, ${src1}, ${src2}`);
        break;
      case "mul":
        lines.push(`  muls ${dst}, ${src1}, ${src2}`);
        break;
      case "load":
        lines.push(`  ldr ${dst}, [${src1}]`);
        break;
      case "store":
        lines.push(`  str ${src2}, [${src1}]`);
        break;
      case "barrier":
        lines.push("  dmb");
        break;
      case "ret":
        // r0 holds return value in AAPCS
        if (ins.uses.length > 0 && src1 !== "r0") {
          lines.push(`  mov r0, ${src1}`);
        }
        break;
    }

    return lines;
  }
}

export function createArmTargetBackend(): ArmTargetBackend {
  return new ArmTargetBackend();
}
