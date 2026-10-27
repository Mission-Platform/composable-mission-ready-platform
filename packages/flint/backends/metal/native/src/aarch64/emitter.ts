import type {
  MachFunction,
  MachInstruction,
  MachModule,
  TargetBackend,
} from "@mission-platform/flint-machir";

import { alignSysVStackFrame } from "../abi/systemv.js";

export interface AArch64EmissionOptions {
  readonly os?: "linux" | "darwin" | "baremetal";
}

/**
 * AArch64 (ARM64) 64-bit Native Target Backend.
 */
export class AArch64TargetBackend implements TargetBackend<
  AArch64EmissionOptions,
  string
> {
  public readonly targetName = "aarch64";
  public readonly targetCategory = "metal" as const;
  public readonly architecture = "aarch64" as const;

  public emit(
    machModule: MachModule,
    options: AArch64EmissionOptions = {},
  ): string {
    const lines: string[] = ["  .arch armv8-a", "  .text", ""];

    for (const fn of machModule.functions) {
      lines.push(...this.emitFunction(fn, options));
      lines.push("");
    }

    return lines.join("\n");
  }

  private emitFunction(
    fn: MachFunction,
    _options: AArch64EmissionOptions,
  ): string[] {
    const frameSize = alignSysVStackFrame(fn.stackFrameSize);
    const lines: string[] = [
      `  .global ${fn.name}`,
      `  .type ${fn.name}, %function`,
      `${fn.name}:`,
      `  stp x29, x30, [sp, #-16]! /* Push frame pointer and link register */`,
      "  mov x29, sp",
    ];

    if (frameSize > 0) {
      lines.push(`  sub sp, sp, #${frameSize}`);
    }

    for (const block of fn.blocks) {
      if (block.label !== "entry") {
        lines.push(`.${fn.name}_${block.label}:`);
      }
      for (const ins of block.instructions) {
        lines.push(...this.emitInstruction(ins));
      }
    }

    if (frameSize > 0) {
      lines.push(`  add sp, sp, #${frameSize}`);
    }

    lines.push("  ldp x29, x30, [sp], #16 /* Restore fp and lr */");
    lines.push("  ret");
    lines.push(`  .size ${fn.name}, .-${fn.name}`);
    return lines;
  }

  private regName(regIndex?: number): string {
    if (regIndex === undefined) return "x0";
    return `x${regIndex}`;
  }

  private emitInstruction(ins: MachInstruction): string[] {
    const lines: string[] = [];
    const dst = this.regName(ins.defs[0]?.assignedHardwareIndex);
    const src1 = this.regName(ins.uses[0]?.assignedHardwareIndex);
    const src2 = this.regName(ins.uses[1]?.assignedHardwareIndex);

    switch (ins.opcode) {
      case "mov":
        if (ins.immediate !== undefined) {
          lines.push(`  mov ${dst}, #${ins.immediate}`);
        } else {
          lines.push(`  mov ${dst}, ${src1}`);
        }
        break;
      case "add":
        lines.push(`  add ${dst}, ${src1}, ${src2}`);
        break;
      case "sub":
        lines.push(`  sub ${dst}, ${src1}, ${src2}`);
        break;
      case "mul":
        lines.push(`  mul ${dst}, ${src1}, ${src2}`);
        break;
      case "load":
        lines.push(`  ldr ${dst}, [${src1}]`);
        break;
      case "store":
        lines.push(`  str ${src2}, [${src1}]`);
        break;
      case "barrier":
        lines.push("  dmb ish");
        break;
      case "ret":
        if (ins.uses.length > 0 && src1 !== "x0") {
          lines.push(`  mov x0, ${src1}`);
        }
        break;
    }

    return lines;
  }
}

export function createAArch64TargetBackend(): AArch64TargetBackend {
  return new AArch64TargetBackend();
}
