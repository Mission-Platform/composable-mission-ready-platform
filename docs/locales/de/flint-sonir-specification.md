# Spezifikation der Sea-of-Nodes Intermediate Representation (SonIR 2.0).

Maschinenunterstützte Übersetzung aus der kanonischen englischen Quelle. Bei Bedarf manuell nachprüfen. Paketnamen, Befehle, Pfade und technische Bezeichner bleiben unverändert.

> docs/flint-sonir-specification.md: [docs/flint-sonir-specification.md](../../flint-sonir-specification.md)
> Sprache: Deutsch (de)

**Spezifikationsversion:** 2.0.0 (Zielarchitekturvorschlag)
**Compiler-Baseline:** SonIR 1.0 (`FLINT_SON_SCHEMA_VERSION = '1.0'`) in `@mission-platform/flint`
**Meilensteinziel:** Welle 2 / Problem Nr. 45 (formelles Sea-of-Nodes-Schema, Speicher-SSA, GVN und SCCP)
**Status:** Architekturvorschlag und Zielschemaspezifikation
**Compiler:** `@mission-platform/flint`

---

## 1. Architekturprinzipien

SonIR 2.0 ist eine Sea-of-Nodes-Zwischendarstellung, die Datenfluss-, Kontrollfluss- und Speichereffektdiagramme in einer einzigen Diagrammdarstellung basierend auf Cliff Clicks Sea-of-Nodes-Kalkül vereint.

### 1.1 Invarianten

- **Explizites Triple-Port-Modell:** Jeder node unterteilt seine Ports explizit in:
  1. **Steuerports:** Ausführungsreihenfolge, regionale Konvergenz, Schleifenköpfe und Verzweigungsentscheidungen.
  2. **Speicher-/Effektports (Speicher-SSA):** Zustandstoken, die Speicherabhängigkeiten, Lasten, Speicherungen, Zuweisungen und Barrieren darstellen.
  3. **Wertports:** Reine Werte, typisierte Arithmetik, logische Operationen und Referenzen.
- **Deterministische Optimierung:** Durchgänge sind deterministisch und werden über Global Value Numbering (GVN) idempotent hashkonsiert.
- **Grapheninvarianz:** Transformationen bewahren die Speichersicherheit, die affine Besitzsemantik und explizite Fähigkeitsgrenzen.

### 1.2 Basisimplementierung und SonIR 2.0-Übergangsplan

Der aktive Compiler (`@mission-platform/flint`) gibt derzeit SonIR 1.0 (`FLINT_SON_SCHEMA_VERSION = '1.0'`) aus:

- **SonIR 1.0 Baseline:** Implementiert einheitliche Datenfluss-/Kontrollknoten, die in Kontrollregionen (`function`, `block`, `branch`, `loop`, `switch`) unterteilt sind, mit Effekt-Tags auf node-Ebene (`pure`, `read`, `write`, `call`, `control`, `allocation`, `unknown`) und Alias-Fakten (`none`, `local`, `borrowed`, `mutable`, `unknown`). Der Speicher wird unter dem Modell `region-arc-checked-linear` verwaltet.
- **SonIR 2.0 Target Evolution (Ausgabe Nr. 45, Welle 2):**
  – Explizites Triple-Port-Edge-Routing ersetzt implizite Regionsmitgliedschaft.
  - Formeller Entwurf des JSON-Schemas 2020-12 für Serialisierung, Inspektion und Verifizierung.
  - Speicher-SSA-Token, die Redundant Load Eliminierung (RLE) und Speicherweiterleitung ermöglichen.
  - Formale GVN- und Sparse Conditional Constant Propagation (SCCP)-Durchgänge.
  – Unterstützung für die Trennung mehrerer Speicher (`multi-memory-segregated`) für Wave 4.

---

## 2. Formales Schema und Node-Anatomie

### 2.1 Node Hierarchie und Port-Kategorisierung

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

### 2.2 Formale JSON-Schemadefinition (Ziel v2.0)

Das Ziel-JSON-Schema für vom Compiler serialisierte SonIR 2.0-Modulartefakte:

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

## 3. Node Operationen und Kategorien

### 3.1 Kontrollknoten

- **`Start`**: Funktionseinstiegspunkt, der anfängliche Steuerungs- und Speichertoken bereitstellt.
- **`Region`**: Führt mehrere eingehende Kontrollflüsse zusammen (z. B. Ende von `if/else`, Schleifenkopf).
- **`If`**: Nimmt eine Steuereingabe und eine boolesche Werteingabe an; gibt die Kontrollprojektionen `IfTrue` und `IfFalse` aus.
- **`Loop`**: Schleifenheaderbereich mit eingehender Vorwärtssteuerung und Rückwärtssteuerung.
- **`Return`**: Funktionsbeendigung mit einem Steuertoken, einem Speichertoken und einem Ergebniswert.

### 3.2 Speicher-SSA-Knoten

- **`MemoryPhi`**: Führt Speichertokens über unterschiedliche Kontrollflüsse hinweg bei einem `Region` zusammen.
- **`Load`**: Liest den Speicher bei `(base, offset)`. Übernimmt die Kontrolle, das Speichertoken und den Adresswert. Gibt ein Speichertoken und einen geladenen Wert aus.
- **`Store`**: Schreibt Speicher bei `(base, offset)`. Übernimmt die Kontrolle, den Speichertoken, den Adresswert und den gespeicherten Wert. Gibt ein aktualisiertes Speichertoken aus.
- **`HeapAlloc`**: Ordnet eine eigene Struktur im linearen oder regionalen Speicher zu. Nimmt Kontroll- und Erinnerungsmarker; Gibt Speichertoken und Zeigerwert aus.
- **`Fence` / `Barrier`**: Legt Reihenfolgeeinschränkungen für Multithread- oder Host-Shared-Speicher fest.

### 3.3 Reine Wertknoten

- **`Constant`**: Literale Zahlen, boolesche Werte und Zeichenfolgenverweise.
- **`Add`, `Sub`, `Mul`, `Div`, `Mod`**: Arithmetik mit fester Breite und Gleitkomma.
- **`Shl`, `Shr`, `And`, `Or`, `Xor`**: Bitweise Manipulation.
- **`VectorLoad`, `VectorAdd`, `VectorFMA`**: SIMD 128-Bit-Vektoranweisungen (`v128`).

---

## 4. Optimierungspipeline

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

### 4.1 Optimierungsdurchlaufmatrix

| Optimierungspass | SonIR 1.0 Basislinie | SonIR 2.0 Target (Ausgabe Nr. 45) | Hauptnutzen |
| :------------------------------------ | :---------------------- | :---------------------------- | :-------------------------------- |
| **Konstante und Kopierpropagierung** | Implementiert | Erweitert mit Gitterwerten | Vereinfacht Datenflussausdrücke |
| **Global Value Numbering (GVN)** | Strukturelle Kongruenz | Dominator-Baum-Kongruenz | Eliminiert redundante Berechnungen |
| **CFG & Regionsvereinfachung** | Regionszusammenführung | Umstrukturierung mehrerer Regionen | Entfernt bedingungslose Sprünge |
| **Speicher SSA RLE** | Nicht implementiert | Vollständige Store-to-Load-Weiterleitung | Reduziert lineare Speicherzugriffe |
| **Loop Invariante Code Motion (LICM)** | Nicht implementiert | Heben vor dem Vorsatz | Reduziert den Aufwand für die Schleifeniteration |
| **Grenzwertanalyse** | Intervallprüfungen | Polyedrische Wertebereichsbeweise | Eliminiert Laufzeitgrenzen-Traps |
| **Dead Node Pruning** | Erreichbarkeitsmarkierung/Sweep | Liveness nach der Bestellung umkehren | Verkleinert den endgültigen binären Fußabdruck |

---

## 5. WebAssembly-Absenkung und Hardwarebeschleunigung

1. **SIMD (`v128`) Vektorisierung (Problem Nr. 44, Welle 3):** Gibt Hardware-Vektoranweisungen für Slice-Operationen, Scanner-Bitprüfungen und parallele Vergleiche aus.
2. **Massenspeicheroperationen (Problem Nr. 44, Welle 3):** Reduziert Kopier- und Füllschleifen auf die hardwareoptimierten `memory.copy` und `memory.fill`.
3. **Tail Calls (`tail-call`):** Verwendet `return_call` für rekursive Funktionen, Parser und Zustandsmaschinenschleifen, um $O(1)$ Stapelspeicherplatz zu gewährleisten.
4. **Multi-Memory-Partitionierung (Problem Nr. 49, Welle 4):** Isoliert die Ausführung des privaten Gast-Heaps von den Host-Interop-Übertragungspuffern und garantiert so eine Speicherbeschädigung interner Datenstrukturen.

---

## 6. Zugehörige Spezifikationen und Architekturdokumente

- [Flint-Sprachspezifikation](flint-language-specification.md)
- [Architekturübersicht](architecture.md)
- [Best Practices](best-practices.md)
