# 海节点中间表示 (SonIR 2.0) 规范

由规范英文源进行的机器辅助翻译。必要时请人工审校。包名、命令、路径与技术标识符保持不变。

> docs/flint-sonir-specification.md: [docs/flint-sonir-specification.md](../../flint-sonir-specification.md)
> 语言: 简体中文 (zh)

**规范版本：** 2.0.0（目标架构提案）
**编译器基准：** `@mission-platform/flint` 中的 SonIR 1.0 (`FLINT_SON_SCHEMA_VERSION = '1.0'`)
**里程碑目标：** 第 2 波/第 45 期（正式节点海架构、内存 SSA、GVN 和 SCCP）
**状态：** 架构提案和目标架构规范
**编译器：** `@mission-platform/flint`

---

## 1. 架构原理

SonIR 2.0 是一种节点海中间表示，它基于 Cliff Click 的节点海演算将数据流、控制流和记忆效应图统一为单个图形表示。

### 1.1 不变量

- **显式三端口模型：** 每个 node 都将其端口显式隔离为：
  1. **控制端口：** 执行顺序、区域收敛、循环头和分支决策。
  2. **内存/效果端口（内存 SSA）：** 表示内存依赖性、加载、存储、分配和屏障的状态令牌。
  3. **值端口：** 纯值、类型化算术、逻辑运算和引用。
- **确定性优化：** 传递是确定性的，并且通过全局值编号 (GVN) 进行幂等哈希处理。
- **图不变性：** 转换保留内存安全、仿射所有权语义和显式能力边界。

### 1.2 基线实施和 SonIR 2.0 过渡计划

活动编译器 (`@mission-platform/flint`) 当前发出 SonIR 1.0 (`FLINT_SON_SCHEMA_VERSION = '1.0'`)：

- **SonIR 1.0 基线：** 实现划分为控制区域的统一数据流/控制节点（`function`、`block`、`branch`、`loop`、`switch`），并带有 node 级效果标签（`pure`、`read`、 `write`、`call`、`control`、`allocation`、`unknown`）和别名事实（`none`、`local`、`borrowed`、`mutable`、`unknown`）。内存在 `region-arc-checked-linear` 模型下进行管理。
- **SonIR 2.0 目标演进（问题 #45，第 2 波）：**
  - 显式三端口边缘路由取代隐式区域成员资格。
  - 用于序列化、检查和验证的正式草案 2020-12 JSON 架构。
  - 内存 SSA 令牌可实现冗余负载消除 (RLE) 和存储转发。
  - 正式 GVN 和稀疏条件常数传播 (SCCP) 通过。
  - Wave 4 的多内存隔离支持 (`multi-memory-segregated`)。

---

## 2. 形式模式和 Node 剖析

### 2.1 Node 层次结构和端口分类

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

### 2.2 正式的 JSON 模式定义（Target v2.0）

由编译器序列化的 SonIR 2.0 模块工件的目标 JSON 架构：

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

## 3. Node 操作及类别

### 3.1 控制节点

- **`Start`**：提供初始控制和内存令牌的函数入口点。
- **`Region`**：合并多个传入控制流（例如，`if/else` 的末尾、循环头）。
- **`If`**：采用控制输入和布尔值输入；发出 `IfTrue` 和 `IfFalse` 控制投影。
- **`Loop`**：具有传入前向控制和后沿控制的循环标头区域。
- **`Return`**：函数退出，获取控制令牌、内存令牌和结果值。

### 3.2 内存SSA节点

- **`MemoryPhi`**：在 `Region` 处合并不同控制流的内存令牌。
- **`Load`**：读取 `(base, offset)` 处的内存。获取控制权、内存令牌、地址值；发出内存令牌和加载值。
- **`Store`**：写入 `(base, offset)` 处的内存。获取控制权、内存令牌、地址值、存储值；发出更新的内存令牌。
- **`HeapAlloc`**：在线性或区域内存中分配拥有的结构。获取控制权和内存令牌；发出内存令牌和指针值。
- **`Fence` / `Barrier`**：建立多线程或主机共享内存的排序约束。

### 3.3 纯价值节点

- **`Constant`**：文字数字、布尔值和字符串引用。
- **`Add`、`Sub`、`Mul`、`Div`、`Mod`**：固定宽度和浮点运算。
- **`Shl`、`Shr`、`And`、`Or`、`Xor`**：按位操作。
- **`VectorLoad`、`VectorAdd`、`VectorFMA`**：SIMD 128 位向量指令 (`v128`)。

---

## 4. 优化流程

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

### 4.1 优化传递矩阵

|优化通行证| SonIR 1.0 基线 | SonIR 2.0 目标（问题#45）|主要好处|
| :------------------------------------ | :---------------------- | :---------------------------- | :-------------------------------- |
| **恒定和复制传播** |已实施 |通过 Lattice Values 进行增强 |简化数据流表达式 |
| **全球价值编号 (GVN)** |结构一致性|支配树一致性 |消除冗余计算 |
| **CFG 和区域简化** |区域合并 |多地区重组|删除无条件跳转 |
| **内存 SSA RLE** |未实施 |完整的存储到装载转发 |减少线性内存访问 |
| **循环不变代码运动 (LICM)** |未实施 |预收割台提升|减少循环迭代工作 |
| **边界证明分析** |间隔检查|多面体值域证明|消除运行时边界陷阱 |
| **死 Node 修剪** |可达性标记/扫描 |反向订单后活跃度 |缩小最终二进制文件的占用空间

---

## 5. WebAssembly 降低和硬件加速

1. **SIMD (`v128`) 矢量化（第 44 期，第 3 波）：** 发出用于切片操作、扫描器位检查和并行比较的硬件矢量指令。
2. **大容量内存操作（问题 #44，第 3 波）：** 将复制和填充循环降低到硬件优化的 `memory.copy` 和 `memory.fill`。
3. **尾部调用 (`tail-call`)：** 使用 `return_call` 进行递归函数、解析器和状态机循环，以保证 $O(1)$ 堆栈空间。
4. **多内存分区（第 49 期，第 4 波）：** 将私有来宾堆执行与主机互操作传输缓冲区隔离，保证内部数据结构的零内存损坏。

---

## 6. 相关规范及架构文档

- [Flint 语言规范](flint-language-specification.md)
- [架构概述](architecture.md)
- [最佳实践](best-practices.md)
