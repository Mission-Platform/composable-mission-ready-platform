# Especificación de representación intermedia de mar de nodos (SonIR 2.0)

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> docs/flint-sonir-specification.md: [docs/flint-sonir-specification.md](../../flint-sonir-specification.md)
> Idioma: Español (es)

**Versión de especificación:** 2.0.0 (Propuesta de arquitectura de destino)
**Línea base del compilador:** SonIR 1.0 (`FLINT_SON_SCHEMA_VERSION = '1.0'`) en `@mission-platform/flint`
**Objetivo de hito:** Ola 2/Edición n.º 45 (esquema formal de mar de nodos, memoria SSA, GVN y SCCP)
**Estado:** Propuesta de arquitectura y especificación del esquema objetivo
**Compilador:** `@mission-platform/flint`

---

## 1. Principios arquitectónicos

SonIR 2.0 es una representación intermedia de Sea-of-Nodes que unifica gráficos de flujo de datos, flujo de control y efecto de memoria en una única representación gráfica basada en el cálculo Sea-of-Nodes de Cliff Click.

### 1.1 Invariantes

- **Modelo explícito de triple puerto:** Cada node segrega explícitamente sus puertos en:
  1. **Puertos de control:** Orden de ejecución, convergencia regional, encabezados de bucle y decisiones de bifurcación.
  2. **Puertos de memoria/efecto (Memoria SSA):** Tokens de estado que representan dependencias, cargas, almacenes, asignaciones y barreras de memoria.
  3. **Puertos de valores:** Valores puros, aritmética escrita, operaciones lógicas y referencias.
- **Optimización determinista:** Los pases son deterministas y tienen un control idempotente mediante la numeración de valores globales (GVN).
- **Invariancia de gráfico:** Las transformaciones preservan la seguridad de la memoria, la semántica de propiedad afín y los límites de capacidad explícitos.

### 1.2 Implementación de referencia y plan de transición de SonIR 2.0

El compilador activo (`@mission-platform/flint`) emite actualmente SonIR 1.0 (`FLINT_SON_SCHEMA_VERSION = '1.0'`):

- **Línea base de SonIR 1.0:** Implementa nodos de control/flujo de datos unificados divididos en regiones de control (`function`, `block`, `branch`, `loop`, `switch`), con etiquetas de efecto de nivel node (`pure`, `read`, `write`, `call`, `control`, `allocation`, `unknown`) y hechos de alias (`none`, `local`, `borrowed`, `mutable`, `unknown`). La memoria se gestiona bajo el modelo `region-arc-checked-linear`.
- **Evolución del objetivo de SonIR 2.0 (N.° 45, oleada 2):**
  - Enrutamiento perimetral explícito de triple puerto que reemplaza la membresía regional implícita.
  - Borrador formal del esquema JSON 2020-12 para serialización, inspección y verificación.
  - Tokens de memoria SSA que permiten la eliminación de carga redundante (RLE) y el reenvío de almacenamiento.
  - Pases formales de GVN y de propagación constante condicional dispersa (SCCP).
  - Soporte de segregación de memoria múltiple (`multi-memory-segregated`) para Wave 4.

---

## 2. Esquema formal y anatomía Node

### 2.1 Node Jerarquía y categorización de puertos

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

### 2.2 Definición formal del esquema JSON (Target v2.0)

El esquema JSON de destino para los artefactos del módulo SonIR 2.0 serializados por el compilador:

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

## 3. Node Operaciones y Categorías

### 3.1 Nodos de control

- **`Start`**: Punto de entrada de función que proporciona tokens de control y memoria iniciales.
- **`Region`**: fusiona múltiples flujos de control entrantes (por ejemplo, final de `if/else`, inicio de bucle).
- **`If`**: Toma una entrada de control y una entrada de valor booleano; emite proyecciones de control `IfTrue` y `IfFalse`.
- **`Loop`**: Región de encabezado de bucle con control directo entrante y control de borde posterior.
- **`Return`**: Salida de función tomando un token de control, un token de memoria y un valor de resultado.

### 3.2 Nodos SSA de memoria

- **`MemoryPhi`**: combina tokens de memoria en flujos de control divergentes en `Region`.
- **`Load`**: Lee la memoria en `(base, offset)`. Toma control, token de memoria, valor de dirección; emite un token de memoria y un valor cargado.
- **`Store`**: Escribe la memoria en `(base, offset)`. Toma control, token de memoria, valor de dirección, valor almacenado; emite un token de memoria actualizado.
- **`HeapAlloc`**: Asigna una estructura propia en memoria lineal o regional. Toma fichas de Control y Memoria; emite un token de memoria y un valor de puntero.
- **`Fence` / `Barrier`**: Establece restricciones de orden para memoria multiproceso o compartida por host.

### 3.3 Nodos de valor puro

- **`Constant`**: Números literales, booleanos y referencias de cadenas.
- **`Add`, `Sub`, `Mul`, `Div`, `Mod`**: Aritmética de ancho fijo y coma flotante.
- **`Shl`, `Shr`, `And`, `Or`, `Xor`**: Manipulación bit a bit.
- **`VectorLoad`, `VectorAdd`, `VectorFMA`**: Instrucciones vectoriales SIMD de 128 bits (`v128`).

---

## 4. Canal de optimización

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

### 4.1 Matriz de paso de optimización

| Pase de optimización | Línea base de SonIR 1.0 | Objetivo SonIR 2.0 (Número 45) | Beneficio primario |
| :------------------------------------ | :---------------------- | :---------------------------- | :-------------------------------- |
| **Propagación constante y de copia** | Implementado | Mejorado con valores de celosía | Simplifica las expresiones de flujo de datos |
| **Numeración de valores globales (GVN)** | Congruencia estructural | Congruencia árbol dominador | Elimina cálculos redundantes |
| **CFG y simplificación regional** | Fusión de regiones | Reestructuración multirregional | Elimina saltos incondicionales |
| **Memoria SSA RLE** | No implementado | Reenvío completo de tienda a carga | Reduce los accesos a memoria lineal |
| **Movimiento de código invariante de bucle (LICM)** | No implementado | Elevación previa al cabezal | Reduce el trabajo de iteración del bucle |
| **Análisis de prueba de límites** | Comprobaciones de intervalo | Pruebas de rango de valores poliédricos | Elimina las trampas de límites de tiempo de ejecución |
| **Poda Node muerta** | Marca de accesibilidad/barrido | Vida inversa posterior al pedido | Reduce la huella binaria final |

---

## 5. Reducción de WebAssembly y aceleración de hardware

1. **Vectorización SIMD (`v128`) (Edición #44, Onda 3):** Emite instrucciones vectoriales de hardware para operaciones de corte, comprobaciones de bits de escáner y comparaciones paralelas.
2. **Operaciones de memoria masiva (Edición #44, Onda 3):** Reduce los bucles de copia y relleno a `memory.copy` y `memory.fill` optimizados por hardware.
3. **Llamadas de cola (`tail-call`):** Utiliza `return_call` para funciones recursivas, analizadores y bucles de máquina de estados para garantizar el espacio de pila $O(1)$.
4. **Partición de memoria múltiple (Problema #49, Onda 4):** Aísla la ejecución del montón privado de invitados de los buffers de transferencia de interoperabilidad del host, garantizando cero corrupción de memoria de las estructuras de datos internas.

---

## 6. Especificaciones y documentos de arquitectura relacionados

- [Especificación del lenguaje Flint](flint-language-specification.md)
- [Descripción general de la arquitectura](architecture.md)
- [Mejores prácticas](best-practices.md)
