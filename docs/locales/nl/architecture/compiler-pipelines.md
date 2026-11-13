# Flint Compiler-architectuur: Sea-of-Nodes Intermediate Representation (SonIR)

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> docs/architecture/compiler-pipelines.md: [docs/architecture/compiler-pipelines.md](../../../architecture/compiler-pipelines.md)
> Taal: Nederlands (nl)

Dit document biedt de architectonische specificatie voor de **Flint**-compilerpijplijn, waarbij de nadruk ligt op de tussenliggende kernrepresentatie: **SonIR** (Sea-of-Nodes IR).

SonIR past de Sea-of-Nodes-calculus van Cliff Click aan voor krachtige WebAssembly-compilatie. Door de controlestroom, pure datastroom en geheugenbijeffecten te verenigen in één enkele grafiek met expliciet getypte poorten, maakt SonIR agressieve optimalisatiepassages mogelijk, waaronder Global Value Numbering (GVN), Sparse Conditional Constant Propagation (SCCP), Memory SSA Redundant Load Elimination (RLE), Loop-Invariant Code Motion (LICM) en Compile-Time Bounds Proof Elimination.

---

## 1. Compilatiepijplijn op hoog niveau

De Flint-compilerpijplijn transformeert Flint-broncode op hoog niveau in geverifieerde, verzwakte WebAssembly:

```mermaid
flowchart TD
    Source["Flint Source Code (.flint)"] --> Lexer["Lexer & Tokenizer"]
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

## 2. SonIR-architectuurmodel: de drievoudige zee van knooppunten

In traditionele compilerarchitecturen wordt de besturingsstroom weergegeven als een besturingsstroomgrafiek (CFG) van basisblokken, terwijl de gegevensstroom binnen basisblokken wordt weergegeven via SSA-registers. Deze scheiding creëert synchronisatie-overhead tijdens optimalisatiepassages, zoals codebeweging of eliminatie van overtollige expressies.

SonIR elimineert fundamentele blokgrenzen. Functies worden weergegeven als een uniforme gerichte grafiek waarin knooppunten waarden berekenen of effecten uitvoeren, en randen afhankelijkheden vertegenwoordigen. Om de degelijkheid te behouden, scheidt elke node expliciet zijn invoer- en uitvoerranden over **drie verschillende poortcategorieën**:

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

### 2.1 De drie rand-/poortcategorieën

| Havencategorie |   Randnotatie | Semantiek en bestelgaranties | Representatieve knooppunten |
| :------------- | :----------------: | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------- |
| **Controle** | Solid Vet (`==>`) | Regelt de sequentiële uitvoeringsvolgorde, voorwaardelijke vertakkingsbeslissingen, lusheaders en functiebeëindiging. Pure-waardeknooppunten hebben geen stuuringangen.                                                           | `Start`, `Region`, `If`, `IfTrue`, `IfFalse`, `Loop`, `Return` |
| **Geheugen-SSA** |  Gestreept (`-.->`) | Threads abstracte geheugenstatustokens die effectafhankelijkheden vertegenwoordigen. Zorgt ervoor dat laad-/opslagbewerkingen voldoen aan de beperkingen van lezen na schrijven en schrijven na schrijven, zonder het onafhankelijke geheugen te veel te beperken. | `MemoryPhi`, `Load`, `Store`, `HeapAlloc`, `Fence`, `Call` |
| **Waarde** | Solid Dun (`-->`) | Bevat pure waarden en rekenkundige resultaten. Vrij van beperkingen op het gebied van de controlestroom; knooppunten met pure waarde-invoer kunnen vrij rondzweven in de zee van knooppunten, alleen afhankelijk van gegevensafhankelijkheden.                             | `Constant`, `Add`, `Sub`, `Mul`, `Cmp`, `Phi`, `VectorAdd` |

---

## 3. Node Anatomie en TypeScript Weergave

Binnen `@mission-platform/flint` worden knooppunten weergegeven door de `FlintSoNNode`-interface en geserialiseerd in deterministische `.sonir.json`-moduleartefacten.

### 3.1 Node Interfacestructuur

```typescript
export interface FlintSoNNode {
  /** Unique sequential identifier within the compilation unit */
  readonly id: number;
  /** Operation classification (e.g., 'start', 'constant', 'load', 'store', 'region', 'if', 'return') */
  readonly kind: string;
  /** Enclosing function name */
  readonly functionName: string;
  /** Input node dependencies (in SonIR 2.0 partitioned into control, memory, and value inputs) */
  readonly inputs: readonly number[];
  /** Effect classifications: 'pure' | 'read' | 'write' | 'call' | 'control' | 'allocation' | 'unknown' */
  readonly effects: readonly FlintSoNEffect[];
  /** Alias analysis classification: 'none' | 'local' | 'borrowed' | 'mutable' | 'unknown' */
  readonly alias: FlintSoNAliasFact;
  /** Affine ownership classification: 'value' | 'borrowed' | 'owned' | 'shared' | 'unknown' */
  readonly ownership: FlintSoNOwnershipFact;
  /** Value type representation (e.g., 'i32', 'f64', 'bool', 'ptr', 'v128') */
  readonly type?: string;
  /** Literal constant payload */
  readonly value?: boolean | number | string;
  /** Callee name for call nodes */
  readonly callee?: string;
  /** Source span provenance for diagnostics and debugging */
  readonly span?: FlintSourceSpan;
}
```

### 3.2 Node-classificaties en poortroutering

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

## 4. Aliasanalyse en geheugen-SSA

Geheugen SSA behandelt geheugen als een expliciet waardetoken. Een `Store` node verbruikt een geheugentoken $M_{in}$ en zendt een nieuw token $M_{out}$ uit. A `Load` node neemt een geheugentoken $M_{in}$ en adres $V_{ptr}$, zendt de geladen waarde $V_{out}$ uit en draagt ​​het geheugentoken mee naar voren.

### 4.1 Classificatie van aliasanalyse

Elke node die geheugenadressen draagt of manipuleert, wordt getagd met een aliasfeit:

- **`none`**: pure primitieve waarden (scalaren) of knooppunten zonder geheugenindirectie.
- **`local`**: geheugen toegewezen in het huidige activeringsframe of regio. Gegarandeerd niet te ontsnappen aan de lokale reikwijdte; onbereikbaar voor bellers.
- **`borrowed`**: een onveranderlijke verwijzing (`&T`) naar geheugen dat elders eigendom is. Kan niet worden gewijzigd via deze hendel; gelijktijdig lezen is veilig.
- **`mutable`**: een exclusieve veranderlijke referentie (`&mut T`). Garandeert dat dit geheugen tijdens zijn levensduur geen andere referentiealiassen krijgt.
- **`unknown`**: ontsnapte referenties, import van capaciteiten of dynamische heap-pointers met onbepaalde herkomst.

### 4.2 Disjuncte alias-ondubbelzinnigheid bij doorsturen van winkel naar lading

Wanneer twee pointers $P_1$ en $P_2$ aantoonbaar onsamenhangende aliasdomeinen hebben:
$$\text{AliasClass}(P_1) \cap \text{AliasClass}(P_2) = \emptyset$$

De optimalisatie bewijst dat een `Store` tot $P_2$ de inhoud van $P_1$ niet kan veranderen. Dit maakt het volgende mogelijk:

1. **Redundant Load Elimination (RLE)** tussen tussenliggende winkels en niet-aliased geheugen.
2. **Store-to-Load Forwarding**: Een `Load` die een `Store` volgt naar hetzelfde adres, hergebruikt direct de opgeslagen waarde-operand zonder op het geheugen te wachten.
3. **Eliminatie van dode winkels**: als twee winkels naar dezelfde `local`- of `mutable`-pointer schrijven zonder tussenliggende leesbewerkingen, wordt het eerste geheugen gesnoeid.

---

## 5. Voorbeeld van end-to-end-transformatie: voorwaardelijke geheugenmutatie

Om te illustreren hoe code op hoog niveau wordt toegewezen aan SonIR, wordt geoptimaliseerd en wordt verlaagd naar Wasm, kunt u deze Flint-functie overwegen:

```flint
fn compute(x: i32, ptr: &mut i32) -> i32 {
  if x > 10 {
    *ptr = x * 2;
  } else {
    *ptr = 0;
  }
  return *ptr + 1;
}
```

### 5.1 Initiële verlaagde SonIR-grafiek

In de niet-geoptimaliseerde grafiek voeren beide vestigingen onafhankelijke opslag uit naar `ptr`. Op het samenvoegpunt convergeert een `Region` node de besturing, en een `MemoryPhi` convergeert de geheugenstatus. De daaropvolgende `Load` leest uit `ptr` met behulp van het geconvergeerde geheugentoken:

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

### 5.2 Optimalisatiepassen en eliminatie van redundante belasting (RLE)

Tijdens de optimalisatiepijplijn:

1. **Geheugen-SSA-analyse**: de optimalisatie inspecteert `Load [17]`. De adresinvoer is `ptr [3]` en de geheugeninvoer is `MemoryPhi [16]`.
2. **Tracering van voorgangers**:
   - Op het binnenkomende pad `IfTrue` schreef `StoreThen [13]` `Mul [12]` (`x * 2`) naar `ptr [3]`.
   - Op het binnenkomende pad `IfFalse` schreef `StoreElse [14]` `Constant: 0 [6]` naar `ptr [3]`.
3. **Store-to-Load Forwarding**: Omdat `ptr` onvoorwaardelijk is geschreven op alle paden die `Region [15]` binnenkomen en `ptr` exclusieve `mutable`-aliasing heeft zonder tussenliggende schrijfbewerkingen:
   - Een pure **Waarde `Phi`** node wordt gesynthetiseerd op `Region [15]`:
     $$\text{Phi}[20] = \text{Phi}(\text{Regio}[15], \text{Mul}[12], \text{Constante}[6])$$
   - De uitvoer van `Load [17]` wordt vervangen door `Phi [20]`.
   - `Load [17]` heeft geen resterende gebruikerswaarde en het geheugentoken geeft `MemoryPhi [16]` eenvoudigweg door aan `Return [19]`. `Load [17]` wordt gesnoeid als dode code.

### 5.3 Geoptimaliseerde SonIR-grafiek

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

### 5.4 Uitgezonden WebAssembly-instructies

Omdat het lezen van het geheugen volledig werd geëlimineerd in SonIR, vermijdt de uitgezonden WebAssembly een dure `i32.load`-instructie:

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

## 6. Lustransformaties en bewijzen van compilatietijdgrenzen

In array/vectorlussen modelleert SonIR lusheaders met `Loop`-controlegebieden en bijbehorende `Phi`- en `MemoryPhi`-knooppunten.

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

### Optimalisatiehoogtepunten in loops:

1. **Loop-Invariant Code Motion (LICM)**: knooppunten waarvan de waarde- en geheugeninvoer volledig buiten de `Loop`-regio afkomstig is, worden uit de lusbody naar de pre-header geleid.
2. **Bounds Proof Elimination**: De compiler construeert inductieve bereikintervallen voor lusindices ($0 \le i < N$). Als $N \le \text{length}$, zijn grenscontroles veilig gebleken tijdens het compileren en geëlimineerd, waardoor runtime branch-instructies uit interne lussen worden geëlimineerd.
3. **SIMD-vectorisatie**: lineaire sequentiële array-lussen die overeenkomen met het patroon worden rechtstreeks verlaagd naar 128-bit SIMD-knooppunten (`v128.load`, `i32x4.add`), waarbij 4 elementen per klokcyclus worden verwerkt.

---

## 7. Artefactschema en tooling-integratie

Elke gecompileerde Flint-module zendt zijn geverifieerde SonIR-grafiek uit naast Wasm-binaire bestanden:

- Artefactpadconventie: `<target>.sonir.json`
- Tools zoals `mcp_mission-platform_flint_inspect_sonir` en `mcp_mission-platform_flint_verify_artifact` inspecteren dit artefact om grenscontroles, grafiekhashes en naleving van mogelijkheden te verifiëren voordat het in sandboxes wordt geïmplementeerd.
