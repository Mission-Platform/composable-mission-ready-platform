import type {
  MachFunction,
  MachInstruction,
  MachModule,
  TargetBackend,
} from "@mission-platform/flint-machir";

import { alignSysVStackFrame } from "../abi/systemv.js";
import { alignWin64StackFrame } from "../abi/win64.js";

export interface Amd64EmissionOptions {
  readonly abi?: "sysv" | "win64";
}

/**
 * AMD64 (x86_64) Native Target Backend.
 */
export class Amd64TargetBackend implements TargetBackend<
  Amd64EmissionOptions,
  string
> {
  public readonly targetName = "amd64";
  public readonly targetCategory = "metal" as const;
  public readonly architecture = "amd64" as const;

  public emit(
    machModule: MachModule,
    options: Amd64EmissionOptions = {},
  ): string {
    const lines: string[] = ["  .intel_syntax noprefix", "  .text", ""];

    for (const fn of machModule.functions) {
      lines.push(...this.emitFunction(fn, options));
      lines.push("");
    }

    return lines.join("\n");
  }

  private emitFunction(
    fn: MachFunction,
    options: Amd64EmissionOptions,
  ): string[] {
    const isWin = options.abi === "win64";
    const frameSize = isWin
      ? alignWin64StackFrame(fn.stackFrameSize)
      : alignSysVStackFrame(fn.stackFrameSize);

    const lines: string[] = [
      `  .global ${fn.name}`,
      `  .type ${fn.name}, @function`,
      `${fn.name}:`,
      "  push rbp",
      "  mov rbp, rsp",
    ];

    if (frameSize > 0) {
      lines.push(`  sub rsp, ${frameSize}`);
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
      lines.push(`  add rsp, ${frameSize}`);
    }

    lines.push("  pop rbp");
    lines.push("  ret");
    lines.push(`  .size ${fn.name}, .-${fn.name}`);
    return lines;
  }

  private regName(regIndex?: number): string {
    const regs = [
      "rax",
      "rcx",
      "rdx",
      "rbx",
      "rsi",
      "rdi",
      "r8",
      "r9",
      "r10",
      "r11",
    ];
    if (regIndex === undefined || regIndex >= regs.length) return "rax";
    return regs[regIndex]!;
  }

  private emitInstruction(ins: MachInstruction): string[] {
    const lines: string[] = [];
    const dst = this.regName(ins.defs[0]?.assignedHardwareIndex);
    const src1 = this.regName(ins.uses[0]?.assignedHardwareIndex);
    const src2 = this.regName(ins.uses[1]?.assignedHardwareIndex);

    switch (ins.opcode) {
      case "mov":
        if (ins.immediate !== undefined) {
          lines.push(`  mov ${dst}, ${ins.immediate}`);
        } else {
          lines.push(`  mov ${dst}, ${src1}`);
        }
        break;
      case "add":
        lines.push(`  mov ${dst}, ${src1}`);
        lines.push(`  add ${dst}, ${src2}`);
        break;
      case "sub":
        lines.push(`  mov ${dst}, ${src1}`);
        lines.push(`  sub ${dst}, ${src2}`);
        break;
      case "mul":
        lines.push(`  mov ${dst}, ${src1}`);
        lines.push(`  imul ${dst}, ${src2}`);
        break;
      case "load":
        lines.push(`  mov ${dst}, [${src1}]`);
        break;
      case "store":
        lines.push(`  mov [${src1}], ${src2}`);
        break;
      case "barrier":
        lines.push("  mfence");
        break;
      case "ret":
        if (ins.uses.length > 0 && src1 !== "rax") {
          lines.push(`  mov rax, ${src1}`);
        }
        break;
    }

    return lines;
  }
}

export function createAmd64TargetBackend(): Amd64TargetBackend {
  return new Amd64TargetBackend();
}
