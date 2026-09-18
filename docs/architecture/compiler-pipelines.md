# Forge Web Script Compiler Architecture: Sea-of-Nodes Intermediate Representation (SonIR)

This document provides the architectural specification for the **Forge Web Script (`FWS`)** compiler pipeline, focusing on its core intermediate representation: **SonIR** (Sea-of-Nodes IR).

SonIR adapts Cliff Click's Sea-of-Nodes calculus to high-performance WebAssembly compilation. By unifying control flow, pure dataflow, and memory side effects into a single graph with explicit typed ports, SonIR enables aggressive optimization passes—including Global Value Numbering (GVN), Sparse Conditional Constant Propagation (SCCP), Memory SSA Redundant Load Elimination (RLE), Loop-Invariant Code Motion (LICM), and Compile-Time Bounds Proof Elimination.

---

## 1. High-Level Compilation Pipeline

The FWS compiler pipeline transforms high-level Forge Web Script source code into verified, capability-attenuated WebAssembly:

```mermaid
flowchart TD
    Source["FWS Source Code (.fws)"] --> Lexer["Lexer & Tokenizer"]
    Lexer --> Parser["AST Parser (ast.ts)"]
    Parser --> TypeChecker["Type Checker & Inference (type-checker.ts)"]
    TypeChecker --> SemanticAnalysis["Capability & Purity Analysis"]
    SemanticAnalysis --> Lowering["SonIR Lowering (son-ir.ts)"]

    subgraph SonIR_Optimization ["SonIR Optimization Pipeline"]
        direction TB
        Lowering --> GVN["Global Value Numbering (GVN)"]
        GVN --> SCCP["Sparse Conditional Constant Propagation"]
        SCCP --> MemSSA["Memory SSA: Store Forwarding & RLE"]
        MemSSA --> LICM["Loop-Invariant Code Motion (LICM)"]
        LICM --> BoundsProof["Bounds Proof Elimination"]
        BoundsProof --> DeadPruning["Dead Node & Region Pruning"]
    end

    DeadPruning --> CodeGen["Wasm Code Generator (backend.ts)"]
    CodeGen --> WasmBinary["WebAssembly Binary (.wasm)"]
    CodeGen --> Manifest["ABI Manifest (.manifest.json)"]
```

---

## 2. SonIR Architectural Model: The Triple-Port Sea-of-Nodes

In traditional compiler architectures, control flow is represented as a control flow graph (CFG) of basic blocks, while data flow is represented within basic blocks via SSA registers. This separation creates synchronization overhead during optimization passes like code motion or redundant expression elimination.

SonIR eliminates basic block boundaries. Functions are represented as a unified directed graph where nodes compute values or perform effects, and edges represent dependencies. To maintain soundness, every node explicitly segregates its input and output edges across **three distinct port categories**:

```mermaid
flowchart LR
    subgraph Inputs ["Input Ports"]
        C_IN["Control In (C_in)"]
        M_IN["Memory In (M_in / Memory SSA)"]
        V_IN["Value In (V_in)"]
    end

    subgraph Node ["SonIR Node Anatomy"]
        direction TB
        ID["Node ID: u32 | Kind: OpCode"]
        META["Type: TypeDescriptor | Alias: AliasFact"]
        EFF["Purity: EffectSet | Ownership: OwnershipFact"]
    end

    subgraph Outputs ["Output Ports"]
        C_OUT["Control Out (C_out)"]
        M_OUT["Memory Out (M_out)"]
        V_OUT["Value Out (V_out)"]
    end

    C_IN ==> Node
    M_IN -.-> Node
    V_IN --> Node

    Node ==> C_OUT
    Node -.-> M_OUT
    Node --> V_OUT

    classDef control fill:#f8d7da,stroke:#dc3545,stroke-width:2px;
    classDef memory fill:#fff3cd,stroke:#ffc107,stroke-width:2px;
    classDef value fill:#d4edda,stroke:#28a745,stroke-width:2px;

    class C_IN,C_OUT control;
    class M_IN,M_OUT memory;
    class V_IN,V_OUT value;
```

### 2.1 The Three Edge / Port Categories

| Port Category  |   Edge Notation    | Semantics & Ordering Guarantees                                                                                                                                                                                 | Representative Nodes                                           |
| :------------- | :----------------: | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------- |
| **Control**    | Solid Bold (`==>`) | Governs sequential execution order, conditional branching decisions, loop headers, and function termination. Pure value nodes have no control inputs.                                                           | `Start`, `Region`, `If`, `IfTrue`, `IfFalse`, `Loop`, `Return` |
| **Memory SSA** |  Dashed (`-.->`)   | Threads abstract memory state tokens representing effect dependencies. Ensures load/store operations adhere to read-after-write and write-after-write constraints without over-constraining independent memory. | `MemoryPhi`, `Load`, `Store`, `HeapAlloc`, `Fence`, `Call`     |
| **Value**      | Solid Thin (`-->`) | Carries pure values and arithmetic results. Free of control-flow constraints; nodes with pure value inputs can float freely in the sea of nodes, subject only to data dependencies.                             | `Constant`, `Add`, `Sub`, `Mul`, `Cmp`, `Phi`, `VectorAdd`     |

---

## 3. Node Anatomy & TypeScript Representation

Within `@mission-platform/forge-web-script`, nodes are represented by the `ForgeWebScriptSoNNode` interface and serialized into deterministic `.sonir.json` module artifacts.

### 3.1 Node Interface Structure

```typescript
export interface ForgeWebScriptSoNNode {
  /** Unique sequential identifier within the compilation unit */
  readonly id: number;
  /** Operation classification (e.g., 'start', 'constant', 'load', 'store', 'region', 'if', 'return') */
  readonly kind: string;
  /** Enclosing function name */
  readonly functionName: string;
  /** Input node dependencies (in SonIR 2.0 partitioned into control, memory, and value inputs) */
  readonly inputs: readonly number[];
  /** Effect classifications: 'pure' | 'read' | 'write' | 'call' | 'control' | 'allocation' | 'unknown' */
  readonly effects: readonly ForgeWebScriptSoNEffect[];
  /** Alias analysis classification: 'none' | 'local' | 'borrowed' | 'mutable' | 'unknown' */
  readonly alias: ForgeWebScriptSoNAliasFact;
  /** Affine ownership classification: 'value' | 'borrowed' | 'owned' | 'shared' | 'unknown' */
  readonly ownership: ForgeWebScriptSoNOwnershipFact;
  /** Value type representation (e.g., 'i32', 'f64', 'bool', 'ptr', 'v128') */
  readonly type?: string;
  /** Literal constant payload */
  readonly value?: boolean | number | string;
  /** Callee name for call nodes */
  readonly callee?: string;
  /** Source span provenance for diagnostics and debugging */
  readonly span?: ForgeWebScriptSourceSpan;
}
```

### 3.2 Node Classifications & Port Routing

```
┌─────────────────┬─────────────────────┬─────────────────────┬──────────────────────┐
│ Node OpCode     │ Incoming Ports      │ Outgoing Ports      │ Description          │
├─────────────────┼─────────────────────┼─────────────────────┼──────────────────────┤
│ Start           │ None                │ Control, Memory     │ Function entry point │
│ Constant        │ None                │ Value               │ Literal constant     │
│ Add / Sub / Mul │ Value, Value        │ Value               │ Pure arithmetic      │
│ If              │ Control, Value      │ Control (T/F proj)  │ Branch predicate     │
│ IfTrue / False  │ Control (from If)   │ Control             │ Branch projection    │
│ Region          │ Control, Control    │ Control             │ Control merge point  │
│ Phi             │ Region, Value, Val  │ Value               │ Value merge point    │
│ MemoryPhi       │ Region, Mem, Mem    │ Memory              │ Memory SSA merge     │
│ Load            │ Control, Mem, Ptr   │ Memory, Value       │ Heap / stack read    │
│ Store           │ Control, Mem, Ptr, V│ Memory              │ Heap / stack write   │
│ Return          │ Control, Mem, Value │ None                │ Function exit        │
└─────────────────┴─────────────────────┴─────────────────────┴──────────────────────┘
```

---

## 4. Alias Analysis & Memory SSA

Memory SSA treats memory as an explicit value token. A `Store` node consumes a memory token $M_{in}$ and emits a new token $M_{out}$. A `Load` node takes a memory token $M_{in}$ and address $V_{ptr}$, emitting the loaded value $V_{out}$ and carrying the memory token forward.

### 4.1 Alias Analysis Classification

Every node carrying or manipulating memory addresses is tagged with an alias fact:

- **`none`**: Pure primitive values (scalars) or nodes with no memory indirection.
- **`local`**: Memory allocated in the current activation frame or region. Guaranteed not to escape the local scope; inaccessible to callers.
- **`borrowed`**: An immutable reference (`&T`) to memory owned elsewhere. Cannot be modified through this handle; concurrent reads are safe.
- **`mutable`**: An exclusive mutable reference (`&mut T`). Guarantees no other reference aliases this memory during its lifetime.
- **`unknown`**: Escaped references, capability imports, or dynamic heap pointers with undetermined provenance.

### 4.2 Disjoint Alias Disambiguation in Store-to-Load Forwarding

When two pointers $P_1$ and $P_2$ have provably disjoint alias domains:
$$\text{AliasClass}(P_1) \cap \text{AliasClass}(P_2) = \emptyset$$

The optimizer proves that a `Store` to $P_2$ cannot alter the contents of $P_1$. This permits:

1. **Redundant Load Elimination (RLE)** across intervening stores to non-aliased memory.
2. **Store-to-Load Forwarding**: A `Load` following a `Store` to the same address directly reuses the stored value operand without waiting on memory.
3. **Dead Store Elimination**: If two stores write to the same `local` or `mutable` pointer without intervening reads, the first store is pruned.

---

## 5. End-to-End Transformation Example: Conditional Memory Mutation

To illustrate how high-level code maps to SonIR, undergoes optimization, and lowers to Wasm, consider this FWS function:

```fws
fn compute(x: i32, ptr: &mut i32) -> i32 {
  if x > 10 {
    *ptr = x * 2;
  } else {
    *ptr = 0;
  }
  return *ptr + 1;
}
```

### 5.1 Initial Lowered SonIR Graph

In the unoptimized graph, both branches perform independent stores to `ptr`. At the merge point, a `Region` node converges control, and a `MemoryPhi` converges the memory state. The subsequent `Load` reads from `ptr` using the converged memory token:

```mermaid
graph TD
    classDef control fill:#f8d7da,stroke:#dc3545,stroke-width:2px;
    classDef memory fill:#fff3cd,stroke:#ffc107,stroke-width:2px;
    classDef value fill:#d4edda,stroke:#28a745,stroke-width:2px;

    %% Entry nodes
    N1["Start [1]"]:::control
    P_x["Param: x [2] (i32)"]:::value
    P_ptr["Param: ptr [3] (ptr, mutable)"]:::value
    C10["Constant: 10 [4] (i32)"]:::value
    C2["Constant: 2 [5] (i32)"]:::value
    C0["Constant: 0 [6] (i32)"]:::value
    C1["Constant: 1 [7] (i32)"]:::value

    %% Branch decision
    Cmp["CmpGt: x > 10 [8]"]:::value
    P_x --> Cmp
    C10 --> Cmp

    If["If [9]"]:::control
    N1 ==> If
    Cmp --> If

    IfTrue["IfTrue [10]"]:::control
    IfFalse["IfFalse [11]"]:::control
    If ==>|C| IfTrue
    If ==>|C| IfFalse

    %% Then Branch
    Mul["Mul: x * 2 [12]"]:::value
    P_x --> Mul
    C2 --> Mul

    StoreThen["Store: *ptr = x * 2 [13]"]:::memory
    IfTrue ==>|C| StoreThen
    N1 -.->|M| StoreThen
    P_ptr --> StoreThen
    Mul --> StoreThen

    %% Else Branch
    StoreElse["Store: *ptr = 0 [14]"]:::memory
    IfFalse ==>|C| StoreElse
    N1 -.->|M| StoreElse
    P_ptr --> StoreElse
    C0 --> StoreElse

    %% Merge Region
    Region["Region [15]"]:::control
    StoreThen ==>|C| Region
    StoreElse ==>|C| Region

    MemPhi["MemoryPhi [16]"]:::memory
    Region ==>|C| MemPhi
    StoreThen -.->|M| MemPhi
    StoreElse -.->|M| MemPhi

    %% Redundant Load
    Load["Load: *ptr [17]"]:::memory
    Region ==>|C| Load
    MemPhi -.->|M| Load
    P_ptr --> Load

    %% Return
    Add["Add: loaded + 1 [18]"]:::value
    Load --> Add
    C1 --> Add

    Ret["Return [19]"]:::control
    Region ==>|C| Ret
    Load -.->|M| Ret
    Add --> Ret
```

### 5.2 Optimization Passes & Redundant Load Elimination (RLE)

During the optimization pipeline:

1. **Memory SSA Analysis**: The optimizer inspects `Load [17]`. Its address input is `ptr [3]`, and its memory input is `MemoryPhi [16]`.
2. **Predecessor Tracing**:
   - On the `IfTrue` incoming path, `StoreThen [13]` wrote `Mul [12]` (`x * 2`) to `ptr [3]`.
   - On the `IfFalse` incoming path, `StoreElse [14]` wrote `Constant: 0 [6]` to `ptr [3]`.
3. **Store-to-Load Forwarding**: Because `ptr` was unconditionally written on all paths entering `Region [15]` and `ptr` has exclusive `mutable` aliasing with no intervening writes:
   - A pure **Value `Phi`** node is synthesized at `Region [15]`:
     $$\text{Phi}[20] = \text{Phi}(\text{Region}[15], \text{Mul}[12], \text{Constant}[6])$$
   - The output of `Load [17]` is replaced with `Phi [20]`.
   - `Load [17]` has no remaining value users and its memory token simply passes `MemoryPhi [16]` through to `Return [19]`. `Load [17]` is pruned as dead code.

### 5.3 Optimized SonIR Graph

```mermaid
graph TD
    classDef control fill:#f8d7da,stroke:#dc3545,stroke-width:2px;
    classDef memory fill:#fff3cd,stroke:#ffc107,stroke-width:2px;
    classDef value fill:#d4edda,stroke:#28a745,stroke-width:2px;

    N1["Start [1]"]:::control
    P_x["Param: x [2]"]:::value
    P_ptr["Param: ptr [3]"]:::value
    C10["Constant: 10 [4]"]:::value
    C2["Constant: 2 [5]"]:::value
    C0["Constant: 0 [6]"]:::value
    C1["Constant: 1 [7]"]:::value

    Cmp["CmpGt: x > 10 [8]"]:::value
    P_x --> Cmp
    C10 --> Cmp

    If["If [9]"]:::control
    N1 ==> If
    Cmp --> If

    IfTrue["IfTrue [10]"]:::control
    IfFalse["IfFalse [11]"]:::control
    If ==> IfTrue
    If ==> IfFalse

    Mul["Mul: x * 2 [12]"]:::value
    P_x --> Mul
    C2 --> Mul

    StoreThen["Store: *ptr = x * 2 [13]"]:::memory
    IfTrue ==> StoreThen
    N1 -.-> StoreThen
    P_ptr --> StoreThen
    Mul --> StoreThen

    StoreElse["Store: *ptr = 0 [14]"]:::memory
    IfFalse ==> StoreElse
    N1 -.-> StoreElse
    P_ptr --> StoreElse
    C0 --> StoreElse

    Region["Region [15]"]:::control
    StoreThen ==> Region
    StoreElse ==> Region

    MemPhi["MemoryPhi [16]"]:::memory
    Region ==> MemPhi
    StoreThen -.-> MemPhi
    StoreElse -.-> MemPhi

    ValPhi["Value Phi: (x*2, 0) [20]"]:::value
    Region --> ValPhi
    Mul --> ValPhi
    C0 --> ValPhi

    Add["Add: ValPhi + 1 [18]"]:::value
    ValPhi --> Add
    C1 --> Add

    Ret["Return [19]"]:::control
    Region ==> Ret
    MemPhi -.-> Ret
    Add --> Ret
```

### 5.4 Emitted WebAssembly Instructions

Because the memory read was completely eliminated in SonIR, the emitted WebAssembly avoids an expensive `i32.load` instruction:

```wat
(func $compute (param $x i32) (param $ptr i32) (result i32)
  (local $val i32)
  local.get $x
  i32.const 10
  i32.gt_s
  if
    local.get $x
    i32.const 1
    i32.shl           ;; x * 2 optimized to shift
    local.tee $val
    local.get $ptr
    i32.store         ;; *ptr = x * 2
  else
    i32.const 0
    local.tee $val
    local.get $ptr
    i32.store         ;; *ptr = 0
  end
  local.get $val      ;; Reuses register value directly from Phi
  i32.const 1
  i32.add             ;; val + 1 without reading memory
  return
)
```

---

## 6. Loop Transformations & Compile-Time Bounds Proofs

In array/vector loops, SonIR models loop headers with `Loop` control regions and corresponding `Phi` and `MemoryPhi` nodes.

```mermaid
graph TD
    classDef control fill:#f8d7da,stroke:#dc3545,stroke-width:2px;
    classDef memory fill:#fff3cd,stroke:#ffc107,stroke-width:2px;
    classDef value fill:#d4edda,stroke:#28a745,stroke-width:2px;

    Pre["Loop Pre-Header"]:::control
    LoopHead["Loop Region [Header]"]:::control

    IndexPhi["Phi: Index (0, Index + 1)"]:::value
    MemLoopPhi["MemoryPhi"]:::memory

    Pre ==> LoopHead
    LoopHead --> IndexPhi
    LoopHead ==> MemLoopPhi

    BoundsProof["Bounds Check Proof\n(Index < Array.length)"]:::value
    IndexPhi --> BoundsProof

    Body["Loop Body (Vector Op / Load)"]:::control
    LoopHead ==> Body

    BackEdge["Backedge Control"]:::control
    Body ==> BackEdge
    BackEdge ==>|Loop Backedge| LoopHead
```

### Optimization Highlights in Loops:

1. **Loop-Invariant Code Motion (LICM)**: Nodes whose value and memory inputs originate entirely outside the `Loop` region are floated out of the loop body into the pre-header.
2. **Bounds Proof Elimination**: The compiler constructs inductive range intervals for loop indices ($0 \le i < N$). If $N \le \text{length}$, bounds checks are proven safe at compile time and eliminated, eliminating runtime branch instructions from inner loops.
3. **SIMD Vectorization**: Linear sequential array loops matching the pattern are lowered directly into 128-bit SIMD nodes (`v128.load`, `i32x4.add`), processing 4 elements per clock cycle.

---

## 7. Artifact Schema & Tooling Integration

Every compiled FWS module emits its verified SonIR graph alongside Wasm binaries:

- Artifact path convention: `<target>.sonir.json`
- Tools such as `mcp_mission-platform_fws_inspect_sonir` and `mcp_mission-platform_fws_verify_artifact` inspect this artifact to verify bounds checks, graph hashes, and capability compliance before deployment to sandboxes.
