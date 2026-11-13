# Architecture du compilateur Flint : représentation intermédiaire en mer de nœuds (SonIR)

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> docs/architecture/compiler-pipelines.md: [docs/architecture/compiler-pipelines.md](../../../architecture/compiler-pipelines.md)
> Langue: Français (fr)

Ce document fournit la spécification architecturale du pipeline du compilateur **Flint**, en se concentrant sur sa représentation intermédiaire principale : **SonIR** (Sea-of-Nodes IR).

SonIR adapte le calcul Sea-of-Nodes de Cliff Click à la compilation WebAssembly hautes performances. En unifiant le flux de contrôle, le flux de données pur et les effets secondaires de la mémoire dans un seul graphique avec des ports typés explicitement, SonIR permet des passes d'optimisation agressives, notamment la numérotation des valeurs globales (GVN), la propagation constante conditionnelle sparse (SCCP), l'élimination de la charge redondante SSA de la mémoire (RLE), le mouvement de code invariant de boucle (LICM) et l'élimination de la preuve des limites au moment de la compilation.

---

## 1. Pipeline de compilation de haut niveau

Le pipeline du compilateur Flint transforme le code source Flint de haut niveau en WebAssembly vérifié et atténué en fonctionnalités :

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

## 2. Modèle architectural SonIR : la mer de nœuds à triple port

Dans les architectures de compilateur traditionnelles, le flux de contrôle est représenté sous la forme d'un graphe de flux de contrôle (CFG) de blocs de base, tandis que le flux de données est représenté dans les blocs de base via des registres SSA. Cette séparation crée une surcharge de synchronisation lors des passes d'optimisation telles que le mouvement du code ou l'élimination des expressions redondantes.

SonIR élimine les limites de blocs de base. Les fonctions sont représentées sous la forme d'un graphe orienté unifié dans lequel les nœuds calculent des valeurs ou exécutent des effets, et les bords représentent des dépendances. Pour maintenir la solidité, chaque node sépare explicitement ses bords d'entrée et de sortie sur **trois catégories de ports distinctes** :

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

### 2.1 Les trois catégories Edge/Port

| Catégorie portuaire |   Notation des bords | Sémantique et garanties de commande | Nœuds représentatifs |
| :------------- | :----------------: | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------- |
| **Contrôle** | Solid Gras (`==>`) | Régit l’ordre d’exécution séquentiel, les décisions de branchement conditionnel, les en-têtes de boucle et la terminaison des fonctions. Les nœuds de valeur pure n’ont aucune entrée de contrôle.                                                           | `Start`, `Region`, `If`, `IfTrue`, `IfFalse`, `Loop`, `Return` |
| **Mémoire SSA** |  En pointillés (`-.->`) | Les threads abstraits des jetons d’état de la mémoire représentant les dépendances d’effet. Garantit que les opérations de chargement/stockage respectent les contraintes de lecture après écriture et d’écriture après écriture sans surcharger la mémoire indépendante. | `MemoryPhi`, `Load`, `Store`, `HeapAlloc`, `Fence`, `Call` |
| **Valeur** | Solid Mince (`-->`) | Transporte des valeurs pures et des résultats arithmétiques. Libre de contraintes de flux de contrôle ; les nœuds avec des entrées de valeur pure peuvent flotter librement dans la mer de nœuds, sous réserve uniquement des dépendances de données.                             | `Constant`, `Add`, `Sub`, `Mul`, `Cmp`, `Phi`, `VectorAdd` |

---

## 3. Anatomie Node et représentation TypeScript

Dans `@mission-platform/flint`, les nœuds sont représentés par l'interface `FlintSoNNode` et sérialisés dans des artefacts de module déterministes `.sonir.json`.

### 3.1 Structure de l'interface Node

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

### 3.2 Classifications Node et routage des ports

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

## 4. Analyse d'alias et mémoire SSA

Mémoire SSA traite la mémoire comme un jeton de valeur explicite. Un `Store` node consomme un jeton mémoire $M_{in}$ et émet un nouveau jeton $M_{out}$. Un `Load` node prend un jeton mémoire $M_{in}$ et une adresse $V_{ptr}$, émettant la valeur chargée $V_{out}$ et transportant le jeton mémoire vers l'avant.

### 4.1 Classification de l'analyse des alias

Chaque node transportant ou manipulant des adresses mémoire est étiqueté avec un alias :

- **`none`** : Valeurs primitives pures (scalaires) ou nœuds sans indirection mémoire.
- **`local`** : Mémoire allouée dans la trame ou la région d'activation actuelle. Garanti de ne pas échapper au périmètre local ; inaccessible aux appelants.
- **`borrowed`** : une référence immuable (`&T`) à la mémoire détenue ailleurs. Ne peut pas être modifié via ce handle ; les lectures simultanées sont sûres.
- **`mutable`** : Une référence mutable exclusive (`&mut T`). Garantit qu'aucune autre référence n'alias cette mémoire pendant sa durée de vie.
- **`unknown`** : références échappées, importations de fonctionnalités ou pointeurs de tas dynamiques de provenance indéterminée.

### 4.2 Désambiguïsation des alias disjoints dans le transfert de magasin à chargement

Lorsque deux pointeurs $P_1$ et $P_2$ ont des domaines d'alias manifestement disjoints :
$$\text{AliasClass}(P_1) \cap \text{AliasClass}(P_2) = \emptyset$$

L'optimiseur prouve qu'un `Store` à $P_2$ ne peut pas modifier le contenu de $P_1$. Cela permet :

1. **Élimination de charge redondante (RLE)** dans les magasins intermédiaires vers une mémoire sans alias.
2. **Redirection Store-to-Load** : Un `Load` suivant un `Store` à la même adresse réutilise directement l'opérande de valeur stockée sans attendre la mémoire.
3. **Élimination des magasins morts** : si deux magasins écrivent sur le même pointeur `local` ou `mutable` sans lecture intermédiaire, le premier magasin est élagué.

---

## 5. Exemple de transformation de bout en bout : mutation de mémoire conditionnelle

Pour illustrer comment le code de haut niveau correspond à SonIR, subit une optimisation et s'abaisse à Wasm, considérons cette fonction Flint :

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

### 5.1 Graphique SonIR initial abaissé

Dans le graphique non optimisé, les deux succursales effectuent des magasins indépendants jusqu'à `ptr`. Au point de fusion, un `Region` node fait converger le contrôle et un `MemoryPhi` fait converger l'état de la mémoire. Le `Load` suivant lit à partir de `ptr` à l'aide du jeton de mémoire convergée :

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

### 5.2 Passes d'optimisation et élimination des charges redondantes (RLE)

Pendant le pipeline d'optimisation :

1. **Analyse mémoire SSA** : l'optimiseur inspecte `Load [17]`. Son entrée d'adresse est `ptr [3]` et son entrée mémoire est `MemoryPhi [16]`.
2. **Traçage des prédécesseurs** :
   - Sur le chemin entrant `IfTrue`, `StoreThen [13]` a écrit `Mul [12]` (`x * 2`) dans `ptr [3]`.
   - Sur le chemin entrant `IfFalse`, `StoreElse [14]` a écrit `Constant: 0 [6]` dans `ptr [3]`.
3. **Redirection du stockage au chargement** : étant donné que `ptr` a été écrit de manière inconditionnelle sur tous les chemins entrant dans `Region [15]` et que `ptr` a un alias `mutable` exclusif sans écriture intermédiaire :
   - Une **Valeur `Phi`** node pure est synthétisée en `Region [15]` :
     $$\text{Phi}[20] = \text{Phi}(\text{Région}[15], \text{Mul}[12], \text{Constant}[6])$$
   - La sortie de `Load [17]` est remplacée par `Phi [20]`.
   - `Load [17]` n'a plus de valeur d'utilisateur et son jeton de mémoire transmet simplement `MemoryPhi [16]` à `Return [19]`. `Load [17]` est élagué en tant que code mort.

### 5.3 Graphique SonIR optimisé

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

### 5.4 Instructions WebAssembly émises

Étant donné que la lecture de la mémoire a été complètement éliminée dans SonIR, le WebAssembly émis évite une instruction `i32.load` coûteuse :

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

## 6. Transformations de boucles et preuves de limites au moment de la compilation

Dans les boucles tableau/vecteur, SonIR modélise les en-têtes de boucle avec les régions de contrôle `Loop` et les nœuds `Phi` et `MemoryPhi` correspondants.

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

### Points forts de l'optimisation dans les boucles :

1. **Mouvement de code invariant de boucle (LICM)** : les nœuds dont les entrées de valeur et de mémoire proviennent entièrement de l'extérieur de la région `Loop` flottent hors du corps de la boucle dans le pré-en-tête.
2. **Élimination de la preuve des limites** : le compilateur construit des intervalles de plage inductifs pour les indices de boucle ($0 \le i < N$). Si $N \le \text{length}$, les vérifications de limites sont prouvées sûres au moment de la compilation et éliminées, éliminant ainsi les instructions de branchement d'exécution des boucles internes.
3. **Vectorisation SIMD** : les boucles de tableau séquentiel linéaire correspondant au modèle sont abaissées directement dans des nœuds SIMD de 128 bits (`v128.load`, `i32x4.add`), traitant 4 éléments par cycle d'horloge.

---

## 7. Schéma d'artefact et intégration d'outils

Chaque module Flint compilé émet son graphe SonIR vérifié aux côtés des binaires Wasm :

- Convention de chemin d'artefact : `<target>.sonir.json`
- Des outils tels que `mcp_mission-platform_flint_inspect_sonir` et `mcp_mission-platform_flint_verify_artifact` inspectent cet artefact pour vérifier les contrôles de limites, les hachages de graphiques et la conformité des capacités avant le déploiement dans des bacs à sable.
