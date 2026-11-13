# Specificatie voor Sea-of-Nodes Intermediate Representation (SonIR 2.0).

Machineondersteunde vertaling van de canonieke Engelse bron. Handmatig nalezen indien nodig. Pakketnamen, opdrachten, paden en technische identificatoren blijven ongewijzigd.

> docs/flint-sonir-specification.md: [docs/flint-sonir-specification.md](../../flint-sonir-specification.md)
> Taal: Nederlands (nl)

**Specificatieversie:** 2.0.0 (voorstel voor doelarchitectuur)
**Compilerbasislijn:** SonIR 1.0 (`FLINT_SON_SCHEMA_VERSION = '1.0'`) in `@mission-platform/flint`
**Mijlpaaldoel:** Golf 2 / Uitgave #45 (Formeel Sea-of-Nodes-schema, Geheugen-SSA, GVN & SCCP)
**Status:** Architectuurvoorstel en doelschemaspecificatie
**Compiler:** `@mission-platform/flint`

---

## 1. Architecturale principes

SonIR 2.0 is een Sea-of-Nodes Intermediate Representation die gegevensstroom-, control-flow- en geheugeneffectgrafieken verenigt in een enkele grafiekweergave op basis van Cliff Click's Sea-of-Nodes-calculus.

### 1.1 Invarianten

- **Expliciet driepoortsmodel:** Elke node scheidt zijn poorten expliciet in:
  1. **Controlepoorten:** Volgorde van uitvoering, regionale convergentie, lusheaders en vertakkingsbeslissingen.
  2. **Geheugen-/effectpoorten (Memory SSA):** Staatstokens die geheugenafhankelijkheden, belasting, opslag, toewijzingen en barrières vertegenwoordigen.
  3. **Waardepoorten:** Pure waarden, getypte rekenkunde, logische bewerkingen en referenties.
- **Deterministische optimalisatie:** Passes zijn deterministisch en idempotent hash-consed via Global Value Numbering (GVN).
- **Grafiek-invariantie:** Transformaties behouden de veiligheid van het geheugen, verfijnen de eigendomssemantiek en expliciete capaciteitsgrenzen.

### 1.2 Basisimplementatie en SonIR 2.0 transitieplan

De actieve compiler (`@mission-platform/flint`) zendt momenteel SonIR 1.0 (`FLINT_SON_SCHEMA_VERSION = '1.0'`) uit:

- **SonIR 1.0 Baseline:** Implementeert uniforme gegevensstroom-/controleknooppunten verdeeld in controlegebieden (`function`, `block`, `branch`, `loop`, `switch`), met effecttags op node-niveau (`pure`, `read`, `write`, `call`, `control`, `allocation`, `unknown`) en aliasfeiten (`none`, `local`, `borrowed`, `mutable`, `unknown`). Het geheugen wordt beheerd onder het model `region-arc-checked-linear`.
- **SonIR 2.0 Target Evolution (uitgave #45, golf 2):**
  - Expliciete edge-routing met drie poorten vervangt het impliciete regiolidmaatschap.
  - Formeel concept 2020-12 JSON-schema voor serialisatie, inspectie en verificatie.
  - Geheugen-SSA-tokens die redundante belastingeliminatie (RLE) en opslagforwarding mogelijk maken.
  - Formele GVN- en Sparse Conditional Constant Propagation (SCCP)-passen.
  - Ondersteuning voor scheiding van meerdere geheugens (`multi-memory-segregated`) voor Wave 4.

---

## 2. Formeel schema en Node Anatomie

### 2.1 Node Hiërarchie en poortcategorisatie

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

### 2.2 Formele JSON-schemadefinitie (Doel v2.0)

Het doel-JSON-schema voor SonIR 2.0-moduleartefacten, geserialiseerd door de compiler:

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

## 3. Node Bewerkingen en categorieën

### 3.1 Controleknooppunten

- **`Start`**: functie-ingangspunt dat initiële controle- en geheugentokens levert.
- **`Region`**: voegt meerdere inkomende besturingsstromen samen (bijvoorbeeld einde van `if/else`, luskop).
- **`If`**: neemt een besturingsinvoer en een Booleaanse waarde-invoer; zendt `IfTrue`- en `IfFalse`-besturingsprojecties uit.
- **`Loop`**: lusheadergebied met inkomende voorwaartse controle en backedge-controle.
- **`Return`**: Functie-exit waarbij een controletoken, geheugentoken en resultaatwaarde worden gebruikt.

### 3.2 Geheugen-SSA-knooppunten

- **`MemoryPhi`**: voegt geheugentokens samen over uiteenlopende besturingsstromen op een `Region`.
- **`Load`**: leest het geheugen op `(base, offset)`. Neemt de controle over, geheugentoken, adreswaarde; zendt geheugentoken en geladen waarde uit.
- **`Store`**: schrijft geheugen naar `(base, offset)`. Neemt de controle over, geheugentoken, adreswaarde, opgeslagen waarde; verzendt een bijgewerkt geheugentoken.
- **`HeapAlloc`**: wijst een eigen structuur toe in lineair of regionaal geheugen. Neemt controle- en geheugentokens over; zendt een geheugentoken en een pointerwaarde uit.
- **`Fence` / `Barrier`**: stelt ordeningsbeperkingen in voor multi-threaded of host-gedeeld geheugen.

### 3.3 Pure waardeknooppunten

- **`Constant`**: letterlijke getallen, booleans en tekenreeksreferenties.
- **`Add`, `Sub`, `Mul`, `Div`, `Mod`**: rekenkunde met vaste breedte en drijvende komma.
- **`Shl`, `Shr`, `And`, `Or`, `Xor`**: Bitsgewijze manipulatie.
- **`VectorLoad`, `VectorAdd`, `VectorFMA`**: SIMD 128-bit vectorinstructies (`v128`).

---

## 4. Optimalisatiepijplijn

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

### 4.1 Optimalisatiepasmatrix

| Optimalisatiepas | SonIR 1.0 Basislijn | SonIR 2.0 doel (probleem #45) | Primair voordeel |
| :------------------------------------ | :---------------------- | :---------------------------- | :-------------------------------- |
| **Constante en kopiepropagatie** | Geïmplementeerd | Verbeterd met roosterwaarden | Vereenvoudigt gegevensstroomexpressies |
| **Globale waardenummering (GVN)** | Structurele congruentie | Dominator-Boomcongruentie | Elimineert overbodige berekeningen |
| **CFG en regiovereenvoudiging** | Regio samenvoegen | Herstructurering in meerdere regio's | Verwijdert onvoorwaardelijke sprongen |
| **Geheugen SSA RLE** | Niet geïmplementeerd | Volledige doorsturing van winkel naar lading | Vermindert lineaire geheugentoegang |
| **Loop Invariant Code Motion (LICM)** | Niet geïmplementeerd | Pre-header hijsen | Vermindert het iteratiewerk van de lus |
| **Grensbewijsanalyse** | Intervalcontroles | Bewijzen van polyedrische waardebereiken | Elimineert runtime-grensvallen |
| **Dood Node Snoeien** | Bereikbaarheid Mark/Sweep | Omgekeerde levendigheid na bestelling | Verkleint de uiteindelijke binaire voetafdruk |

---

## 5. WebAssembly-verlaging en hardwareversnelling

1. **SIMD (`v128`) Vectorisatie (uitgave #44, Wave 3):** Zendt hardware-vectorinstructies uit voor slice-bewerkingen, scannerbitcontroles en parallelle vergelijkingen.
2. **Bulkgeheugenbewerkingen (uitgave nr. 44, Wave 3):** Verlaagt kopieer- en vullussen naar voor hardware geoptimaliseerde `memory.copy` en `memory.fill`.
3. **Tail Calls (`tail-call`):** Gebruikt `return_call` voor recursieve functies, parsers en statusmachinelussen om $O(1)$ stapelruimte te garanderen.
4. **Multi-Memory Partitionering (Issue #49, Wave 4):** Isoleert de uitvoering van de privé-gastheap van host-interop-overdrachtsbuffers, waardoor geen geheugenbeschadiging van interne datastructuren wordt gegarandeerd.

---

## 6. Gerelateerde specificaties en architectuurdocumenten

- [Flint-taalspecificatie](flint-language-specification.md)
- [Architectuuroverzicht](architecture.md)
- [Beste praktijken](best-practices.md)
