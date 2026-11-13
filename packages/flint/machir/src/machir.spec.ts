import { describe, expect, it } from "vitest";

import {
  createLowLevelSonModule,
  lowerFlintAstToHighLevelSon,
  lowerFlintAstToLowLevelSon,
  lowerHighLevelSonToLowLevelSon,
} from "@mission-platform/flint-sonir";

import {
  GraphColoringRegisterAllocator,
  LinearScanRegisterAllocator,
  lowerLowLevelSonToMachIr,
  MachIrOptimizer,
  type MachFunction,
  type MachInstruction,
} from ".";

describe("Flint Machine IR (MachIR)", () => {
  const dummySpan = {
    start: 0,
    end: 0,
    line: 1,
    column: 1,
    endLine: 1,
    endColumn: 1,
  };

  it("lowers LowLevelSonModule with branches into multi-block CFG", () => {
    const sonMod = createLowLevelSonModule("branch_calc");
    const constCond = {
      id: 2,
      opcode: "val.const" as const,
      constantValue: 1,
      valueInputs: [],
      memoryInputs: [],
      controlInputs: [],
      span: dummySpan,
    };
    const branch = {
      id: 3,
      opcode: "ctrl.branch" as const,
      valueInputs: [2],
      memoryInputs: [],
      controlInputs: [1],
      span: dummySpan,
    };
    const constTrue = {
      id: 4,
      opcode: "val.const" as const,
      constantValue: 100,
      valueInputs: [],
      memoryInputs: [],
      controlInputs: [],
      span: dummySpan,
    };
    const retTrue = {
      id: 5,
      opcode: "ctrl.return" as const,
      valueInputs: [4],
      memoryInputs: [],
      controlInputs: [],
      span: dummySpan,
    };
    const constFalse = {
      id: 6,
      opcode: "val.const" as const,
      constantValue: 200,
      valueInputs: [],
      memoryInputs: [],
      controlInputs: [],
      span: dummySpan,
    };
    const retFalse = {
      id: 7,
      opcode: "ctrl.return" as const,
      valueInputs: [6],
      memoryInputs: [],
      controlInputs: [],
      span: dummySpan,
    };

    const module = {
      ...sonMod,
      nodes: [
        ...sonMod.nodes,
        constCond,
        branch,
        constTrue,
        retTrue,
        constFalse,
        retFalse,
      ],
    };

    const mach = lowerLowLevelSonToMachIr(module, "system_v");
    expect(mach.functions.length).toBe(1);
    const fn = mach.functions[0]!;
    expect(fn.blocks.length).toBeGreaterThanOrEqual(2);
    expect(fn.blocks[0]?.successors.length).toBe(2);
    expect(fn.blocks[0]?.instructions.some((i) => i.opcode === "jcc")).toBe(
      true,
    );
  });

  it("allocates physical registers via linear scan allocator", () => {
    const testFn: MachFunction = {
      name: "add_fn",
      stackFrameSize: 0,
      callingConvention: "system_v",
      isInterruptHandler: false,
      blocks: [
        {
          id: 1,
          label: "b1",
          predecessors: [],
          successors: [],
          instructions: [
            {
              id: 1,
              opcode: "mov",
              defs: [{ id: 10, isVirtual: true }],
              uses: [],
              immediate: 5,
              span: dummySpan,
            },
            {
              id: 2,
              opcode: "mov",
              defs: [{ id: 11, isVirtual: true }],
              uses: [],
              immediate: 10,
              span: dummySpan,
            },
            {
              id: 3,
              opcode: "add",
              defs: [{ id: 12, isVirtual: true }],
              uses: [
                { id: 10, isVirtual: true },
                { id: 11, isVirtual: true },
              ],
              span: dummySpan,
            },
            {
              id: 4,
              opcode: "ret",
              defs: [],
              uses: [{ id: 12, isVirtual: true }],
              span: dummySpan,
            },
          ],
        },
      ],
    };

    const allocator = new LinearScanRegisterAllocator([0, 1, 2]);
    const result = allocator.allocate(testFn);

    expect(result.physicalAssignments.size).toBe(3);
    expect(result.spilledRegisters.size).toBe(0);
    expect(
      result.allocatedFunction.blocks[0]?.instructions[0]?.defs[0]?.isVirtual,
    ).toBe(false);
  });

  it("spills registers under high register pressure in linear scan", () => {
    // 5 live variables at the same time, but only 2 hardware registers available
    const testFn: MachFunction = {
      name: "spill_scan_fn",
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
              defs: [{ id: 10, isVirtual: true }],
              uses: [],
              immediate: 1,
              span: dummySpan,
            },
            {
              id: 2,
              opcode: "mov",
              defs: [{ id: 20, isVirtual: true }],
              uses: [],
              immediate: 2,
              span: dummySpan,
            },
            {
              id: 3,
              opcode: "mov",
              defs: [{ id: 30, isVirtual: true }],
              uses: [],
              immediate: 3,
              span: dummySpan,
            },
            {
              id: 4,
              opcode: "mov",
              defs: [{ id: 40, isVirtual: true }],
              uses: [],
              immediate: 4,
              span: dummySpan,
            },
            {
              id: 5,
              opcode: "add",
              defs: [{ id: 50, isVirtual: true }],
              uses: [
                { id: 10, isVirtual: true },
                { id: 20, isVirtual: true },
              ],
              span: dummySpan,
            },
            {
              id: 6,
              opcode: "add",
              defs: [{ id: 60, isVirtual: true }],
              uses: [
                { id: 30, isVirtual: true },
                { id: 40, isVirtual: true },
              ],
              span: dummySpan,
            },
            {
              id: 7,
              opcode: "ret",
              defs: [],
              uses: [
                { id: 50, isVirtual: true },
                { id: 60, isVirtual: true },
              ],
              span: dummySpan,
            },
          ],
        },
      ],
    };

    const allocator = new LinearScanRegisterAllocator([0, 1]);
    const result = allocator.allocate(testFn);

    expect(result.spilledRegisters.size).toBeGreaterThan(0);
    expect(result.requiredStackSlots).toBeGreaterThan(0);
    expect(result.allocatedFunction.stackFrameSize).toBeGreaterThan(0);
  });

  it("allocates registers with multi-class isolation and loop depth spill weighting in graph coloring", () => {
    const testFn: MachFunction = {
      name: "multiclass_fn",
      stackFrameSize: 0,
      callingConvention: "system_v",
      isInterruptHandler: false,
      blocks: [
        {
          id: 1,
          label: "header",
          loopNestingDepth: 2,
          predecessors: [],
          successors: [],
          instructions: [
            {
              id: 1,
              opcode: "mov",
              defs: [{ id: 1, isVirtual: true, physicalClass: "general" }],
              uses: [],
              immediate: 10,
              span: dummySpan,
            },
            {
              id: 2,
              opcode: "mov",
              defs: [{ id: 2, isVirtual: true, physicalClass: "float" }],
              uses: [],
              immediate: 20,
              span: dummySpan,
            },
            {
              id: 3,
              opcode: "add",
              defs: [{ id: 3, isVirtual: true, physicalClass: "general" }],
              uses: [{ id: 1, isVirtual: true, physicalClass: "general" }],
              span: dummySpan,
            },
            {
              id: 4,
              opcode: "ret",
              defs: [],
              uses: [
                { id: 3, isVirtual: true, physicalClass: "general" },
                { id: 2, isVirtual: true, physicalClass: "float" },
              ],
              span: dummySpan,
            },
          ],
        },
      ],
    };

    const allocator = new GraphColoringRegisterAllocator({
      general: [0, 1],
      float: [0, 1],
      vector: [0],
    });
    const result = allocator.allocate(testFn);

    expect(result.physicalAssignments.size).toBe(3);
    expect(result.spilledRegisters.size).toBe(0);
  });

  it("optimizes MachIR basic blocks and modules with peephole, strength reduction, DCE, and CFG simplification", () => {
    const optimizer = new MachIrOptimizer();
    const redundantMov: MachInstruction = {
      id: 1,
      opcode: "mov",
      defs: [{ id: 0, isVirtual: false, assignedHardwareIndex: 0 }],
      uses: [{ id: 0, isVirtual: false, assignedHardwareIndex: 0 }],
      span: dummySpan,
    };
    const addZero: MachInstruction = {
      id: 2,
      opcode: "add",
      immediate: 0,
      defs: [{ id: 1, isVirtual: false, assignedHardwareIndex: 1 }],
      uses: [{ id: 1, isVirtual: false, assignedHardwareIndex: 1 }],
      span: dummySpan,
    };
    const mulPowTwo: MachInstruction = {
      id: 3,
      opcode: "mul",
      immediate: 8,
      defs: [{ id: 2, isVirtual: false, assignedHardwareIndex: 2 }],
      uses: [{ id: 2, isVirtual: false, assignedHardwareIndex: 2 }],
      span: dummySpan,
    };
    const subSelf: MachInstruction = {
      id: 4,
      opcode: "sub",
      defs: [{ id: 3, isVirtual: false, assignedHardwareIndex: 3 }],
      uses: [
        { id: 3, isVirtual: false, assignedHardwareIndex: 3 },
        { id: 3, isVirtual: false, assignedHardwareIndex: 3 },
      ],
      span: dummySpan,
    };

    const block = {
      id: 1,
      label: "entry",
      instructions: [redundantMov, addZero, mulPowTwo, subSelf],
      predecessors: [],
      successors: [2],
    };

    const optimizedBlock = optimizer.optimizeBlock(block);
    expect(optimizedBlock.instructions.some((i) => i.id === 1)).toBe(false);
    expect(optimizedBlock.instructions.some((i) => i.id === 2)).toBe(false);
    expect(optimizedBlock.instructions.find((i) => i.id === 3)?.opcode).toBe(
      "shl",
    );
    expect(optimizedBlock.instructions.find((i) => i.id === 3)?.immediate).toBe(
      3,
    );
    expect(optimizedBlock.instructions.find((i) => i.id === 4)?.opcode).toBe(
      "mov",
    );
    expect(optimizedBlock.instructions.find((i) => i.id === 4)?.immediate).toBe(
      0,
    );

    const unreachableBlock = {
      id: 99,
      label: "unreachable",
      instructions: [addZero],
      predecessors: [],
      successors: [],
    };

    const fn: MachFunction = {
      name: "opt_mod_fn",
      stackFrameSize: 0,
      callingConvention: "system_v",
      isInterruptHandler: false,
      blocks: [block, unreachableBlock],
    };

    const optimizedFn = optimizer.optimizeFunction(fn);
    expect(optimizedFn.blocks.some((b) => b.id === 99)).toBe(false);
  });

  it("lowers authentic Flint AST through HighLevelSon, LowLevelSon, and MachIR in an end-to-end pipeline", () => {
    const ast = {
      kind: "module" as const,
      name: "math_pipeline",
      imports: [],
      structs: [],
      enums: [],
      functions: [
        {
          name: "compute",
          exported: true,
          span: dummySpan,
          parameters: [
            {
              name: "a",
              type: { kind: "primitive" as const, name: "i32" as const },
              span: dummySpan,
            },
            {
              name: "b",
              type: { kind: "primitive" as const, name: "i32" as const },
              span: dummySpan,
            },
          ],
          returnType: { kind: "primitive" as const, name: "i32" as const },
          body: [
            {
              kind: "let" as const,
              name: "sum",
              type: { kind: "primitive" as const, name: "i32" as const },
              value: {
                kind: "binary" as const,
                operator: "+" as const,
                left: {
                  kind: "identifier" as const,
                  name: "a",
                  span: dummySpan,
                },
                right: {
                  kind: "identifier" as const,
                  name: "b",
                  span: dummySpan,
                },
                span: dummySpan,
              },
              span: dummySpan,
            },
            {
              kind: "return" as const,
              value: {
                kind: "identifier" as const,
                name: "sum",
                span: dummySpan,
              },
              span: dummySpan,
            },
          ],
        },
      ],
      tests: [],
      span: dummySpan,
    };

    // Step 1: Lower AST -> High-Level SonIR
    const highLevelSon = lowerFlintAstToHighLevelSon(ast);
    expect(highLevelSon.regions.length).toBeGreaterThan(0);
    expect(highLevelSon.nodes.length).toBeGreaterThan(0);

    // Step 2: Lower High-Level SonIR -> Low-Level SonIR
    const lowLevelSon = lowerHighLevelSonToLowLevelSon(highLevelSon);
    expect(lowLevelSon.nodes.length).toBeGreaterThan(0);
    expect(lowLevelSon.entryControlId).toBeDefined();

    // Step 3: Or Direct AST -> Low-Level SonIR
    const directLowLevelSon = lowerFlintAstToLowLevelSon(ast);
    expect(directLowLevelSon.nodes.length).toBeGreaterThan(0);

    // Step 4: Lower Low-Level SonIR -> MachIR CFG
    const machModule = lowerLowLevelSonToMachIr(directLowLevelSon, "system_v");
    expect(machModule.functions.length).toBe(1);
    const machFn = machModule.functions[0]!;
    expect(machFn.name).toBe("math_pipeline");
    expect(machFn.blocks.length).toBeGreaterThanOrEqual(1);

    // Step 5: Run Register Allocation on emitted MachIR (Linear Scan & Graph Coloring)
    const allocator = new LinearScanRegisterAllocator([0, 1, 2, 3, 4, 5]);
    const allocated = allocator.allocate(machFn);
    expect(allocated.allocatedFunction.blocks.length).toBeGreaterThanOrEqual(1);

    const graphAllocator = new GraphColoringRegisterAllocator([
      0, 1, 2, 3, 4, 5,
    ]);
    const graphAllocated = graphAllocator.allocate(machFn);
    expect(
      graphAllocated.allocatedFunction.blocks.length,
    ).toBeGreaterThanOrEqual(1);

    // Step 6: Optimize MachIR
    const optimizer = new MachIrOptimizer();
    const optMachFn = optimizer.optimizeFunction(allocated.allocatedFunction);
    expect(optMachFn.blocks.length).toBeGreaterThanOrEqual(1);
  });
});
