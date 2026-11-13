# Spécification de représentation intermédiaire Sea-of-Nodes (SonIR 2.0)

Traduction assistée par machine à partir de la source anglaise canonique. À relire manuellement si besoin. Les noms de paquets, commandes, chemins et identifiants techniques restent inchangés.

> docs/flint-sonir-specification.md: [docs/flint-sonir-specification.md](../../flint-sonir-specification.md)
> Langue: Français (fr)

**Version de spécification :** 2.0.0 (proposition d'architecture cible)
**Référence du compilateur :** SonIR 1.0 (`FLINT_SON_SCHEMA_VERSION = '1.0'`) dans `@mission-platform/flint`
**Cible d'étape :** Vague 2/numéro 45 (schéma formel Sea-of-Nodes, mémoire SSA, GVN et SCCP)
**Statut :** Proposition d'architecture et spécification du schéma cible
**Compilateur :** `@mission-platform/flint`

---

## 1. Principes architecturaux

SonIR 2.0 est une représentation intermédiaire Sea-of-Nodes qui unifie les graphiques de flux de données, de flux de contrôle et d'effet mémoire en une seule représentation graphique basée sur le calcul Sea-of-Nodes de Cliff Click.

### 1.1 Invariants

- **Modèle explicite à triple port :** Chaque node sépare explicitement ses ports en :
  1. **Ports de contrôle :** Ordre d'exécution, convergence régionale, en-têtes de boucle et décisions de branchement.
  2. **Ports mémoire/effet (Memory SSA) :** Jetons d'état qui représentent les dépendances, les charges, les magasins, les allocations et les barrières de mémoire.
  3. **Ports de valeurs :** Valeurs pures, arithmétique typée, opérations logiques et références.
- **Optimisation déterministe :** Les passes sont déterministes et idempotentes grâce au hachage via Global Value Numbering (GVN).
- **Invariance des graphiques :** Les transformations préservent la sécurité de la mémoire, la sémantique de propriété affine et les limites explicites des capacités.

### 1.2 Mise en œuvre de base et plan de transition SonIR 2.0

Le compilateur actif (`@mission-platform/flint`) émet actuellement SonIR 1.0 (`FLINT_SON_SCHEMA_VERSION = '1.0'`) :

- **SonIR 1.0 Baseline :** Implémente des nœuds de contrôle/flux de données unifiés partitionnés en régions de contrôle (`function`, `block`, `branch`, `loop`, `switch`), avec des balises d'effet de niveau node (`pure`, `read`, `write`, `call`, `control`, `allocation`, `unknown`) et alias de faits (`none`, `local`, `borrowed`, `mutable`, `unknown`). La mémoire est gérée sous le modèle `region-arc-checked-linear`.
- **Évolution de la cible SonIR 2.0 (numéro 45, vague 2) :**
  - Routage périphérique explicite à trois ports remplaçant l'appartenance implicite à une région.
  - Projet formel de schéma JSON 2020-12 pour la sérialisation, l'inspection et la vérification.
  - Jetons mémoire SSA permettant l'élimination de charge redondante (RLE) et le transfert de stockage.
  - Passes formelles GVN et Sparse Conditional Constant Propagation (SCCP).
  - Prise en charge de la ségrégation multi-mémoire (`multi-memory-segregated`) pour Wave 4.

---

## 2. Schéma formel et anatomie Node

### 2.1 Hiérarchie Node et catégorisation des ports

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

### 2.2 Définition formelle du schéma JSON (Target v2.0)

Le schéma JSON cible pour les artefacts du module SonIR 2.0 sérialisés par le compilateur :

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

## 3. Opérations et catégories Node

### 3.1 Nœuds de contrôle

- **`Start`** : Point d'entrée de fonction fournissant les jetons de contrôle et de mémoire initiaux.
- **`Region`** : fusionne plusieurs flux de contrôle entrants (par exemple, fin de `if/else`, tête de boucle).
- **`If`** : Prend une entrée de contrôle et une entrée de valeur booléenne ; émet des projections de contrôle `IfTrue` et `IfFalse`.
- **`Loop`** : région d'en-tête de boucle avec contrôle avant entrant et contrôle backedge.
- **`Return`** : sortie de fonction prenant un jeton de contrôle, un jeton de mémoire et une valeur de résultat.

### 3.2 Nœuds SSA de mémoire

- **`MemoryPhi`** : fusionne les jetons de mémoire entre des flux de contrôle divergents au niveau d'un `Region`.
- **`Load`** : lit la mémoire sur `(base, offset)`. Prend le contrôle, le jeton mémoire, la valeur de l'adresse ; émet un jeton de mémoire et une valeur chargée.
- **`Store`** : Écrit la mémoire sur `(base, offset)`. Prend le contrôle, le jeton mémoire, la valeur de l'adresse, la valeur stockée ; émet un jeton de mémoire mis à jour.
- **`HeapAlloc`** : Alloue une structure possédée en mémoire linéaire ou régionale. Prend les jetons de contrôle et de mémoire ; émet un jeton de mémoire et une valeur de pointeur.
- **`Fence` / `Barrier`** : établit des contraintes d'ordre pour la mémoire multithread ou partagée par l'hôte.

### 3.3 Nœuds de valeur pure

- **`Constant`** : nombres littéraux, booléens et références de chaîne.
- **`Add`, `Sub`, `Mul`, `Div`, `Mod`** : arithmétique à largeur fixe et à virgule flottante.
- **`Shl`, `Shr`, `And`, `Or`, `Xor`** : manipulation au niveau du bit.
- **`VectorLoad`, `VectorAdd`, `VectorFMA`** : instructions vectorielles SIMD 128 bits (`v128`).

---

## 4. Pipeline d'optimisation

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

### 4.1 Matrice de réussite d'optimisation

| Passe d'optimisation | SonIR 1.0 Base de référence | Cible SonIR 2.0 (numéro 45) | Avantage principal |
| :------------------------------------ | :---------------------- | :---------------------------- | :-------------------------------- |
| **Constant & Copy Propagation**       | Mis en œuvre | Amélioré avec les valeurs de treillis | Simplifie les expressions de flux de données |
| **Global Value Numbering (GVN)**      | Congruence structurelle | Dominator-Tree Congruence     | Élimine les calculs redondants |
| **CFG & Region Simplification**       | Region Merging          | Multi-Region Restructuring    | Supprime les sauts inconditionnels |
| **Memory SSA RLE**                    | Not Implemented         | Full Store-to-Load Forwarding | Reduces linear memory accesses    |
| **Mouvement de code invariant de boucle (LICM)** | Not Implemented         | Pre-Header Hoisting           | Réduit le travail d'itération de boucle |
| **Bounds Proof Analysis**             | Interval Checks         | Preuves de plage de valeurs polyédriques | Élimine les pièges des limites d'exécution |
| **Élagage Node mort** | Marque d'accessibilité/balayage | Vivacité post-commande inversée | Shrinks final binary footprint    |

---

## 5. Abaissement de WebAssembly et accélération matérielle

1. **Vectorisation SIMD (`v128`) (numéro 44, vague 3) :** Émet des instructions vectorielles matérielles pour les opérations de tranche, les vérifications de bits du scanner et les comparaisons parallèles.
2. **Opérations de mémoire en bloc (numéro 44, vague 3) :** Réduit les boucles de copie et de remplissage aux `memory.copy` et `memory.fill` optimisés pour le matériel.
3. **Appels de queue (`tail-call`) :** Utilise `return_call` pour les fonctions récursives, les analyseurs et les boucles de machine à états afin de garantir l'espace de pile $O(1)$.
4. **Partitionnement multi-mémoire (numéro 49, vague 4) :** Isole l'exécution du tas d'invité privé des tampons de transfert d'interopérabilité de l'hôte, garantissant ainsi l'absence de corruption de mémoire des structures de données internes.

---

## 6. Spécifications et documents d'architecture associés

- [Spécification du langage Flint](flint-language-specification.md)
- [Aperçu de l'architecture](architecture.md)
- [Meilleures pratiques](best-practices.md)
