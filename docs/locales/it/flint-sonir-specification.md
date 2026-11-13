# Specifica di rappresentazione intermedia del mare dei nodi (SonIR 2.0).

Traduzione assistita da macchina dalla fonte inglese canonica. Da rivedere manualmente se necessario. Nomi di pacchetti, comandi, percorsi e identificatori tecnici restano invariati.

> docs/flint-sonir-specification.md: [docs/flint-sonir-specification.md](../../flint-sonir-specification.md)
> Lingua: Italiano (it)

**Versione specifica:** 2.0.0 (proposta di architettura di destinazione)
**Base di riferimento del compilatore:** SonIR 1.0 (`FLINT_SON_SCHEMA_VERSION = '1.0'`) in `@mission-platform/flint`
**Obiettivo fondamentale:** Ondata 2/Numero 45 (schema formale Sea-of-Nodes, Memory SSA, GVN e SCCP)
**Stato:** Proposta di architettura e specifica dello schema target
**Compilatore:** `@mission-platform/flint`

---

## 1. Principi architettonici

SonIR 2.0 è una rappresentazione intermedia Sea-of-Nodes che unifica i grafici del flusso di dati, del flusso di controllo e dell'effetto memoria in un'unica rappresentazione grafica basata sul calcolo Sea-of-Nodes di Cliff Click.

### 1.1 Invarianti

- **Modello esplicito a tripla porta:** Ogni node separa esplicitamente le proprie porte in:
  1. **Porte di controllo:** Ordine di esecuzione, convergenza regionale, intestazioni di loop e decisioni di diramazione.
  2. **Porte di memoria/effetti (Memory SSA):** token di stato che rappresentano dipendenze, carichi, archivi, allocazioni e barriere della memoria.
  3. **Porte dei valori:** valori puri, aritmetica tipizzata, operazioni logiche e riferimenti.
- **Ottimizzazione deterministica:** i passaggi sono deterministici e con hash idempotente tramite Global Value Numbering (GVN).
- **Invarianza del grafico:** le trasformazioni preservano la sicurezza della memoria, la semantica della proprietà affine e i limiti espliciti delle capacità.

### 1.2 Implementazione di base e piano di transizione SonIR 2.0

Il compilatore attivo (`@mission-platform/flint`) attualmente emette SonIR 1.0 (`FLINT_SON_SCHEMA_VERSION = '1.0'`):

- **SonIR 1.0 Baseline:** Implementa flussi di dati/nodi di controllo unificati suddivisi in regioni di controllo (`function`, `block`, `branch`, `loop`, `switch`), con tag di effetti a livello node (`pure`, `read`, `write`, `call`, `control`, `allocation`, `unknown`) e fatti alias (`none`, `local`, `borrowed`, `mutable`, `unknown`). La memoria è gestita con il modello `region-arc-checked-linear`.
- **SonIR 2.0 Target Evolution (numero 45, ondata 2):**
  - Il routing edge esplicito a tripla porta sostituisce l'appartenenza implicita alla regione.
  - Bozza formale dello schema JSON 2020-12 per serializzazione, ispezione e verifica.
  - Token SSA di memoria che consentono l'eliminazione del carico ridondante (RLE) e l'inoltro dello store.
  - Passaggi formali GVN e Sparse Conditional Constant Propagation (SCCP).
  - Supporto per la segregazione multi-memoria (`multi-memory-segregated`) per Wave 4.

---

## 2. Schema formale e anatomia Node

### 2.1 Node Gerarchia e categorizzazione delle porte

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

### 2.2 Definizione formale dello schema JSON (Target v2.0)

Lo schema JSON di destinazione per gli artefatti del modulo SonIR 2.0 serializzati dal compilatore:

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

## 3. Node Operazioni e categorie

### 3.1 Nodi di controllo

- **`Start`**: punto di ingresso della funzione che fornisce token di controllo e memoria iniziali.
- **`Region`**: unisce più flussi di controllo in entrata (ad esempio, fine di `if/else`, testata del loop).
- **`If`**: accetta un input di controllo e un input di valore booleano; emette proiezioni di controllo `IfTrue` e `IfFalse`.
- **`Loop`**: regione dell'intestazione del loop con controllo in avanti in entrata e controllo all'indietro.
- **`Return`**: la funzione esce prendendo un token di controllo, un token di memoria e un valore di risultato.

### 3.2 Nodi SSA di memoria

- **`MemoryPhi`**: unisce i token di memoria tra flussi di controllo divergenti in un `Region`.
- **`Load`**: legge la memoria in `(base, offset)`. Prende il controllo, il token di memoria, il valore dell'indirizzo; emette token di memoria e valore caricato.
- **`Store`**: scrive la memoria in `(base, offset)`. Prende il controllo, token di memoria, valore dell'indirizzo, valore memorizzato; emette token di memoria aggiornati.
- **`HeapAlloc`**: alloca una struttura posseduta nella memoria lineare o regionale. Prende gettoni di controllo e memoria; emette token di memoria e valore del puntatore.
- **`Fence` / `Barrier`**: stabilisce i vincoli di ordinamento per la memoria multi-thread o condivisa host.

### 3.3 Nodi di puro valore

- **`Constant`**: numeri letterali, booleani e riferimenti a stringhe.
- **`Add`, `Sub`, `Mul`, `Div`, `Mod`**: aritmetica a larghezza fissa e in virgola mobile.
- **`Shl`, `Shr`, `And`, `Or`, `Xor`**: manipolazione bit a bit.
- **`VectorLoad`, `VectorAdd`, `VectorFMA`**: istruzioni vettoriali SIMD a 128 bit (`v128`).

---

## 4. Pipeline di ottimizzazione

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

### 4.1 Matrice del passaggio di ottimizzazione

| Passaggio di ottimizzazione | SonIR 1.0 Base | Obiettivo SonIR 2.0 (numero 45) | Vantaggio primario |
| :------------------------------------ | :---------------------- | :---------------------------- | :-------------------------------- |
| **Propagazione costante e copia** | Implementato | Migliorato con valori Lattice | Semplifica le espressioni del flusso di dati |
| **Numerazione globale dei valori (GVN)** | Congruenza strutturale | Congruenza dominatore-albero | Elimina i calcoli ridondanti |
| **CFG e semplificazione regionale** | Unione delle regioni | Ristrutturazione multiregionale | Rimuove i salti incondizionati |
| **Memoria SSA RLE** | Non implementato | Inoltro completo dal negozio al carico | Riduce gli accessi lineari alla memoria |
| **Movimento in codice invariante del ciclo (LICM)** | Non implementato | Sollevamento pre-intestazione | Riduce il lavoro di iterazione del ciclo |
| **Analisi della prova dei limiti** | Controlli a intervalli | Prove della gamma di valori poliedrici | Elimina le trappole relative ai limiti di runtime |
| **Potatura Node morta** | Contrassegno/spazzata di raggiungibilità | Inverti la vivacità post-ordine | Riduce l'impronta binaria finale |

---

## 5. Riduzione WebAssembly e accelerazione hardware

1. **Vettoricizzazione SIMD (`v128`) (numero 44, onda 3):** Emette istruzioni vettoriali hardware per operazioni di suddivisione, controlli di bit dello scanner e confronti paralleli.
2. **Operazioni di memoria di massa (numero 44, ondata 3):** Riduce i cicli di copia e riempimento a `memory.copy` e `memory.fill` ottimizzati per l'hardware.
3. **Chiamate di coda (`tail-call`):** Utilizza `return_call` per funzioni ricorsive, parser e cicli di macchine a stati per garantire lo spazio nello stack $O(1)$.
4. **Partizionamento multi-memoria (numero 49, Wave 4):** Isola l'esecuzione dell'heap del guest privato dai buffer di trasferimento di interoperabilità dell'host, garantendo zero corruzione della memoria delle strutture dati interne.

---

## 6. Specifiche correlate e documenti di architettura

- [Specifiche del linguaggio Flint](flint-language-specification.md)
- [Panoramica dell'architettura](architecture.md)
- [Migliori pratiche](best-practices.md)
