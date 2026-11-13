import { describe, expect, it } from "vitest";

import type { MachModule } from "@mission-platform/flint-machir";

import {
  createAArch64TargetBackend,
  createAmd64TargetBackend,
  createElf64Header,
} from ".";

describe("Flint Metal Backend (AArch64 & AMD64 Native)", () => {
  const sampleModule: MachModule = {
    name: "math_ops",
    functions: [
      {
        name: "add_two",
        stackFrameSize: 0,
        callingConvention: "system_v",
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
                immediate: 10,
              },
              {
                id: 2,
                opcode: "mov",
                defs: [{ id: 1, isVirtual: false, assignedHardwareIndex: 1 }],
                uses: [],
                immediate: 20,
              },
              {
                id: 3,
                opcode: "add",
                defs: [{ id: 0, isVirtual: false, assignedHardwareIndex: 0 }],
                uses: [
                  { id: 0, isVirtual: false, assignedHardwareIndex: 0 },
                  { id: 1, isVirtual: false, assignedHardwareIndex: 1 },
                ],
              },
              {
                id: 4,
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

  it("emits valid AArch64 (ARM64) assembly", () => {
    const backend = createAArch64TargetBackend();
    const asm = backend.emit(sampleModule);

    expect(asm).toContain(".arch armv8-a");
    expect(asm).toContain("add_two:");
    expect(asm).toContain("stp x29, x30, [sp, #-16]!");
    expect(asm).toContain("mov x0, #10");
    expect(asm).toContain("mov x1, #20");
    expect(asm).toContain("add x0, x0, x1");
    expect(asm).toContain("ret");
  });

  it("emits valid AMD64 (x86_64) assembly", () => {
    const backend = createAmd64TargetBackend();
    const asm = backend.emit(sampleModule);

    expect(asm).toContain(".intel_syntax noprefix");
    expect(asm).toContain("add_two:");
    expect(asm).toContain("push rbp");
    expect(asm).toContain("mov rax, 10");
    expect(asm).toContain("mov rcx, 20");
    expect(asm).toContain("add rax, rcx");
    expect(asm).toContain("ret");
  });

  it("creates valid ELF64 header for x86_64 and AArch64", () => {
    const elfX64 = createElf64Header(0x3e);
    expect(elfX64[0]).toBe(0x7f);
    expect(elfX64[1]).toBe(0x45);
    expect(elfX64[4]).toBe(2); // 64-bit

    const elfArm64 = createElf64Header(0xb7);
    expect(elfArm64[18]).toBe(0xb7);
  });
});
