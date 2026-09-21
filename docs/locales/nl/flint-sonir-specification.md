# Sea-of-Nodes Intermediate Representation (SonIR 2.0) Specification

**Specification Version:** 2.0.0 (Target Architecture Proposal)  
**Compiler Baseline:** SonIR 1.0 (`FLINT_SON_SCHEMA_VERSION = '1.0'`) in `@mission-platform/flint`  
**Milestone Target:** Wave 2 / Issue #45 (Formal Sea-of-Nodes Schema, Memory SSA, GVN & SCCP)  
**Status:** Architecture Proposal & Target Schema Specification  
**Compiler:** `@mission-platform/flint`

---

## 1. Architectural Principles

SonIR 2.0 is a Sea-of-Nodes Intermediate Representation that unifies data-flow, control-flow, and memory-effect graphs into a single graph representation based on Cliff Click's Sea-of-Nodes calculus.

### 1.1 Invariants

- **Explicit Triple-Port Model:** Every node explicitly segregates its ports into:
  1. **Control Ports:** Order of execution, regional convergence, loop headers, and branching decisions.
  2. **Memory/Effect Ports (Memory SSA):** State tokens that represent memory dependencies, loads, stores, allocations, and barriers.
  3. **Value Ports:** Pure values, typed arithmetic, logical operations, and references.
- **Deterministic Optimization:** Passes are deterministic and idempotently hash-consed via Global Value Numbering (GVN).
- **Graph Invariance:** Transformations preserve memory safety, affine ownership semantics, and explicit capability boundaries.

### 1.2 Baseline Implementation & SonIR 2.0 Transition Plan

The active compiler (`@mission-platform/flint`) currently emits SonIR 1.0 (`FLINT_SON_SCHEMA_VERSION = '1.0'`):

- **SonIR 1.0 Baseline:** Implements unified dataflow/control nodes partitioned into control regions (`function`, `block`, `branch`, `loop`, `switch`), with node-level effect tags (`pure`, `read`, `write`, `call`, `control`, `allocation`, `unknown`) and alias facts (`none`, `local`, `borrowed`, `mutable`, `unknown`). Memory is managed under the `region-arc-checked-linear` model.
- **SonIR 2.0 Target Evolution (Issue #45, Wave 2):**
  - Explicit triple-port edge routing replacing implicit region membership.
  - Formal Draft 2020-12 JSON Schema for serialization, inspection, and verification.
  - Memory SSA tokens enabling redundant load elimination (RLE) and store forwarding.
  - Formal GVN and Sparse Conditional Constant Propagation (SCCP) passes.
  - Multi-memory segregation support (`multi-memory-segregated`) for Wave 4.

---

## 2. Formal Schema & Node Anatomy

### 2.1 Node Hierarchy & Port Categorization

```
       ┌────────────────────────────────────────────────────────┐
       │                   SonIR 2.0 Node                       │
       ├────────────────────────────────────────────────────────┤
       │ Control Inputs  [ C_in_0, C_in_1, ... ]               │
       │ Memory Inputs   [ M_in_0, M_in_1, ... ] (Memory SSA)   │
       │ Value Inputs    [ V_in_0, V_in_1, ... ]                │
       ├────────────────────────────────────────────────────────┤
       │ Node ID: u32                                           │
       │ OpCode:  FlintSoNOpCode                                │
       │ Type:    FlintTypeDescriptor                           │
       │ Alias:   'none' | 'local' | 'borrowed' | 'mutable'     │
       │ Purity:  'pure' | 'read' | 'write' | 'barrier'         │
       ├────────────────────────────────────────────────────────┤
       │ Control Outputs [ C_out_0, ... ]                       │
       │ Memory Outputs  [ M_out_0, ... ]                       │
       │ Value Outputs   [ V_out_0, ... ]                       │
       └────────────────────────────────────────────────────────┘
```

### 2.2 Formal JSON Schema Definition (Target v2.0)

The target JSON schema for SonIR 2.0 module artifacts serialized by the compiler:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "FlintSonIrModuleV2",
  "type": "object",
  "required": [
    "schemaVersion",
    "abiVersion",
    "compilerVersion",
    "graphHash",
    "functions",
    "nodes"
  ],
  "properties": {
    "schemaVersion": { "type": "string", "const": "2.0.0" },
    "abiVersion": { "type": "string" },
    "compilerVersion": { "type": "string" },
    "sourceHash": { "type": "string" },
    "graphHash": { "type": "string" },
    "optimization": { "type": "string", "enum": ["debug", "release"] },
    "boundsChecks": {
      "type": "string",
      "enum": ["runtime", "proven-safe", "excluded-by-profile"]
    },
    "memoryModel": {
      "type": "string",
      "enum": ["region-arc-checked-linear", "multi-memory-segregated"]
    },
    "functions": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "name", "entryNodeId", "exitNodeId", "exported"],
        "properties": {
          "id": { "type": "integer" },
          "name": { "type": "string" },
          "entryNodeId": { "type": "integer" },
          "exitNodeId": { "type": "integer" },
          "exported": { "type": "boolean" },
          "paramTypes": { "type": "array", "items": { "type": "string" } },
          "returnType": { "type": "string" }
        }
      }
    },
    "nodes": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "op", "functionId"],
        "properties": {
          "id": { "type": "integer" },
          "functionId": { "type": "integer" },
          "op": { "type": "string" },
          "type": { "type": "string" },
          "value": { "type": ["boolean", "number", "string", "null"] },
          "controlInputs": { "type": "array", "items": { "type": "integer" } },
          "memoryInputs": { "type": "array", "items": { "type": "integer" } },
          "valueInputs": { "type": "array", "items": { "type": "integer" } },
          "effects": { "type": "array", "items": { "type": "string" } },
          "alias": {
            "type": "string",
            "enum": ["none", "local", "borrowed", "mutable", "unknown"]
          },
          "span": {
            "type": "object",
            "required": ["start", "end", "line", "column"],
            "properties": {
              "start": { "type": "integer" },
              "end": { "type": "integer" },
              "line": { "type": "integer" },
              "column": { "type": "integer" }
            }
          }
        }
      }
    }
  }
}
```

---

## 3. Node Operations & Categories

### 3.1 Control Nodes

- **`Start`**: Function entry point providing initial Control and Memory tokens.
- **`Region`**: Merges multiple incoming control flows (e.g., end of `if/else`, loop head).
- **`If`**: Takes a control input and a boolean value input; emits `IfTrue` and `IfFalse` control projections.
- **`Loop`**: Loop header region with incoming forward control and backedge control.
- **`Return`**: Function exit taking a control token, memory token, and result value.

### 3.2 Memory SSA Nodes

- **`MemoryPhi`**: Merges memory tokens across divergent control flows at a `Region`.
- **`Load`**: Reads memory at `(base, offset)`. Takes Control, Memory token, Address value; emits Memory token and Loaded value.
- **`Store`**: Writes memory at `(base, offset)`. Takes Control, Memory token, Address value, Stored value; emits updated Memory token.
- **`HeapAlloc`**: Allocates an owned structure in linear or regional memory. Takes Control and Memory tokens; emits Memory token and Pointer value.
- **`Fence` / `Barrier`**: Establishes ordering constraints for multi-threaded or host-shared memory.

### 3.3 Pure Value Nodes

- **`Constant`**: Literal numbers, booleans, and string references.
- **`Add`, `Sub`, `Mul`, `Div`, `Mod`**: Fixed-width and floating-point arithmetic.
- **`Shl`, `Shr`, `And`, `Or`, `Xor`**: Bitwise manipulation.
- **`VectorLoad`, `VectorAdd`, `VectorFMA`**: SIMD 128-bit vector instructions (`v128`).

---

## 4. Optimization Pipeline

```
  Lowered IR
      │
      ▼
┌───────────────────────────────┐
│ Global Value Numbering (GVN)  │ ── Fold duplicate arithmetic and address calculations
└───────────────────────────────┘
      │
      ▼
┌───────────────────────────────┐
│ Sparse Conditional Constant   │ ── Constant folding across conditional branches
│ Propagation (SCCP)            │
└───────────────────────────────┘
      │
      ▼
┌───────────────────────────────┐
│ Memory SSA Redundant Load     │ ── Store forwarding & elimination of repeated reads
│ Elimination (RLE)             │
└───────────────────────────────┘
      │
      ▼
┌───────────────────────────────┐
│ Loop Invariant Code Motion    │ ── Hoist loop-invariant calculations to loop pre-headers
│ (LICM)                        │
└───────────────────────────────┘
      │
      ▼
┌───────────────────────────────┐
│ Bounds Proof Elimination      │ ── Prove array/vector indices statically safe; remove checks
└───────────────────────────────┘
      │
      ▼
┌───────────────────────────────┐
│ Dead Node & Region Pruning    │ ── Eliminate unreachable branches and unused pure nodes
└───────────────────────────────┘
      │
      ▼
  Optimized SonIR ──> Wasm Code Generator
```

### 4.1 Optimization Pass Matrix

| Optimization Pass                                        | SonIR 1.0 Baseline | SonIR 2.0 Target (Issue #45) | Primary Benefit                   |
| :------------------------------------------------------- | :--------------------------------- | :-------------------------------------------------------------- | :-------------------------------- |
| **Constant & Copy Propagation**      | Implemented                        | Enhanced with Lattice Values                                    | Simplifies dataflow expressions   |
| **Global Value Numbering (GVN)**      | Structural Congruence              | Dominator-Tree Congruence                                       | Eliminates redundant calculations |
| **CFG & Region Simplification**      | Region Merging                     | Multi-Region Restructuring                                      | Removes unconditional jumps       |
| **Memory SSA RLE**                                       | Not Implemented                    | Full Store-to-Load Forwarding                                   | Reduces linear memory accesses    |
| **Loop Invariant Code Motion (LICM)** | Not Implemented                    | Pre-Header Hoisting                                             | Reduces loop iteration work       |
| **Bounds Proof Analysis**                                | Interval Checks                    | Polyhedral Value Range Proofs                                   | Eliminates runtime bounds traps   |
| **Dead Node Pruning**                                    | Reachability Mark/Sweep            | Reverse Post-Order Liveness                                     | Shrinks final binary footprint    |

---

## 5. WebAssembly Lowering & Hardware Acceleration

1. **SIMD (`v128`) Vectorization (Issue #44, Wave 3):** Emits hardware vector instructions for slice operations, scanner bit-checks, and parallel comparisons.
2. **Bulk Memory Operations (Issue #44, Wave 3):** Lowers copy and fill loops to hardware-optimized `memory.copy` and `memory.fill`.
3. **Tail Calls (`tail-call`):** Uses `return_call` for recursive functions, parsers, and state machine loops to guarantee $O(1)$ stack space.
4. **Multi-Memory Partitioning (Issue #49, Wave 4):** Isolates private guest heap execution from host-interop transfer buffers, guaranteeing zero memory corruption of internal data structures.

---

## 6. Related Specifications & Architecture Documents

- [Flint Language Specification](flint-language-specification.md)
- [Architecture Overview](architecture.md)
- [Best Practices](best-practices.md)
