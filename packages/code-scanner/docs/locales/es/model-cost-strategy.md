# Modelo y estrategia de costos: esfuerzo de cobertura total del corpus ZXING

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/code-scanner/docs/model-cost-strategy.md: [packages/code-scanner/docs/model-cost-strategy.md](../../model-cost-strategy.md)
> Idioma: Español (es)

Este documento captura la **matriz de niveles de modelo** solicitada para el trabajo del corpus de caja negra de ZXING ("agentes de uso de
varios modelos para determinar la mejor manera de lograrlo al costo más efectivo"). Registra qué nivel de modelo es mejor
adecuado para cada etapa de entrega, de modo que dondequiera que exista un mecanismo de delegación el trabajo pueda dirigirse al más barato
nivel de capacidad, y cuando un solo agente hace el trabajo, guía dónde se realiza el mayor esfuerzo (y el modelo más capaz)
debe gastarse.

## Definiciones de niveles

- **Nivel A (superior/más capaz)**: razonamiento novedoso de visión por computadora y decodificación con muchas especificaciones: los nuevos localizadores (MaxiCode
  cuadrícula hexagonal + diana, agrupación de filas PDF417, conjunto de filas apiladas GS1 DataBar) y Reed–Solomon /
  matemáticas de corrección de errores (GF (929) para PDF417, GF (64) para MaxiCode, la combinatoria RSS). Estas son las partes más
  Es probable que se equivoque de manera sutil y sea más difícil de recuperar de un mal primer borrador.
- **Nivel B (medio)**: portabilidad bien especificada de la referencia de ZXING: tablas de simbología, codificadores, generación de ida y vuelta
  pruebas, lógica de aprovechamiento y generalización del cargador PNG. Se conoce la forma de la respuesta; el trabajo es cuidadoso
  transcripción y cableado.
- **Nivel C (barato/mecánico)**: copia masiva, archivos de atribución, andamiaje de referencia, documentos y texto estándar de cableado.
  (etiquetas de formato, `FORMAT_NAMES`, la unión `ScanFormat`).

## Etapa → mapeo de niveles

| Etapa                                                    | Trabajo                                                                  | Nivel |
| -------------------------------------------------------- | ------------------------------------------------------------------------ | ----- |
| 1 Corpus de vendedor + cargador + arnés                  | copia/atribución (C), cargador + lógica de arnés (B)                     | C→B   |
| 2 Aumentar la velocidad de lectura de formatos admitidos | ajuste del localizador + rutas de reintento                              | A→B   |
| 3 familia GS1 DataBar                                    | mesas/codificadores (B), localizador RSS-14 + RS (A)                     | A/B   |
| 4PDF417                                                  | tablas/codificador (B), localizador de escaneo de filas + GF(929) EC (A) | A/B   |
| 5 MaxiCódigo                                             | localizador de rejilla hexagonal + GF(64) RS (A), tablas (B)             | A/B   |
| 6 Cableado + JS + documentos                             | texto estándar/docs + cableado (C), reconstrucción de wasm + humo (B)    | C→B   |

## Principio de costo

Maximice la participación de Nivel C / Nivel B: la portabilidad mecánica (tablas, codificadores, pruebas de ida y vuelta, cableado) es la mayor parte de
el trabajo en nuevo formato y reservar el presupuesto de nivel A para los tres localizadores genuinamente novedosos y su corrección de errores
matemáticas, donde los errores de un modelo más débil son costosos de detectar y corregir. Un pico corto puede comparar un modelo más barato con
un puerto de decodificador antes de comprometer el nivel para el resto.

## ¿Cómo se desarrolló?

- **Etapa 6** (esta etapa) es el caso más claro de Nivel C→B: ampliar
  La unión `FORMAT_NAMES` y `ScanFormat` es mecánica (C); Reconstruyendo el wasm y escribiendo el humo de carga/transmisión.
  La suite con un pequeño lector PNG es un trabajo de nivel medio bien especificado (B). No se necesitaba ningún razonamiento de Nivel A una vez que el nativo
  Se instalaron decodificadores (etapas 3 a 5).
- **Las etapas 3 a 5** se dividieron limpiamente: las tablas/codificadores ZXING y las pruebas de ida y vuelta fueron transcripciones de Nivel B, mientras que las
  Los localizadores y Reed-Solomon (GF (929), GF (64), la combinatoria RSS) fueron el núcleo de Nivel A, consistente con la matriz.
  arriba.

> No había ninguna herramienta de delegación de agentes personalizada disponible durante la implementación, por lo que se
> un solo agente realizó el trabajo mientras dedicaba esfuerzo según esta matriz. el
> la matriz sigue siendo la guía para futuras repeticiones en las que se delegue a múltiples
> los niveles de modelo son posibles.
