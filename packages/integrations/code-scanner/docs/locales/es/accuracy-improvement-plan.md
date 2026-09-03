# Escáner de códigos: plan de mejora de la precisión y registro de migración

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/integrations/code-scanner/docs/accuracy-improvement-plan.md: [packages/integrations/code-scanner/docs/accuracy-improvement-plan.md](../../accuracy-improvement-plan.md)
> Idioma: Español (es)

Un plan para aumentar la tasa de lectura de `@mission-platform/code-scanner` en capturas del mundo real (cargas y cámara en vivo).
marcos), y para mantener la canalización de escaneo dentro de un artefacto Forge Web Script/WebAssembly vinculado estáticamente.

> **Implementación actual:** El escáner se envía como un dispositivo vinculado estáticamente
> Gráfico Forge Web Script en `src/fws`, con un perfil de módulo fuente dinámico
> disponible para módulos decodificadores que se pueden almacenar en caché de forma independiente. El óxido y la caja
> las referencias que se conservan a continuación son únicamente de procedencia migratoria histórica; ellos son
> no empaquetar dependencias de tiempo de ejecución ni generar entradas.
>
> **Progreso:** Fase 0 (pruebas de imágenes generadas ampliadas), Fase 1 (mover el
> proceso completo en un artefacto en proceso) y **Fase 2** (binarización adaptativa + gris
> muestreo de subpíxeles con borrados de Reed-Solomon + reintento del localizador↔decodificador
> bucle) están **hechos** — consulte §1, §2 y §4. **La Fase 3 ya está completa:** la UPC-A /
> Desambiguación EAN-13 (§2 elemento 5), Data Matrix + tolerancia de rotación/inclinación 1D
> (elemento 4), el localizador azteca (elemento 6) y escaneo de múltiples símbolos + ROI (elemento 7)
> todos han aterrizado.

La implementación original dividió el proceso:

- **Locate + sample** se ejecutó en una canalización nativa/wasm heredada: `binarize` → localizadores por simbología. Su punto de entrada `scan`
  devolvió un **búfer etiquetado** `[format, ...payload]`; **no** decodificó.
- **Decode** se ejecutó en JavaScript y llamó a módulos decodificadores separados.

La fase 1 reemplazó eso con una única llamada FWS `scan_and_decode` (ver §1); el
La motivación histórica a continuación se mantiene como justificación, mientras que la fuente actual de
La verdad es el gráfico FWS y su conjunto de conformidad Vitest.

## 1. El problema estructural central: el oleoducto cruzó el límite wasm↔JS dos veces

Antes de la Fase 1, una única exploración era:

```
image (JS)
  → wasm code-scan.scan()            [Rust: binarise + locate + sample]
  → tagged module buffer (JS)        [cross back into JS]
  → decodeQr / decodeMatrix / decodeBarcode (JS façades)
  → wasm qr/matrix/barcode-decode    [cross into a *different* wasm module]
  → payload string (JS)
```

Cada símbolo ubicado se copia de wasm, se remodela en JS y luego se copia en una segunda instancia de wasm para decodificarlo. esto es
el viaje de ida y vuelta que pide el tema. Perjudica tanto el rendimiento como, lo que es más importante para este plan, la **precisión**, porque
el localizador y el decodificador no pueden cooperar:

- **No hay comentarios de decodificación para el localizador.** El localizador de Rust se compromete a un _único_
  binarización, tamaño de símbolo y cuadrícula de módulos. Si la cuadrícula muestreada falla Reed-Solomon/suma de comprobación en el decodificador JS, hay
  no hay forma de pedirle al localizador que vuelva a muestrear con un umbral diferente, un tamaño de módulo de ±1 o un origen desplazado. Un código que
  está _ubicado pero no decodificable_ (el caso exacto al que se dirige el registro de depuración)
  simplemente está perdido.
- **Transferencia con pérdida.** El localizador aplana el estado intermedio rico (niveles de gris, centros de búsqueda de candidatos, por módulo
  confianza) hasta bits duros `0/1` antes de que el decodificador lo vea. El decodificador funciona entonces únicamente con bits.
- **La precedencia de simbología es un instrumento contundente.** Para códigos 1D, el lado JS prueba simbologías en un orden fijo y
  devuelve el primero que lee. Debido a que UPC-A es un subconjunto a nivel de módulo de un EAN-13 con cero inicial, un símbolo UPC-A es
  reportado como EAN-13 (verificado por el nuevo conjunto de pruebas). La decodificación en Rust permite que el localizador contenga sugerencias estructurales (elemento
  recuento, patrones de guardia) para elegir la simbología correcta.

### Arquitectura de destino: una llamada FWS, entrada de imagen, salida de carga

> **Estado: implementado.** El escáner exporta `scan_and_decode`, vincula el
> el decodificador FWS grafica directamente, y la fachada JS decodifica a través de ese único
> llamar. Los detalles a continuación registran el motivo de la migración.

```
image (JS)
  → FWS scanner.scan_and_decode()      [binarise + locate + sample + decode]
  → ScanOutcome { format, value } (JS)
```

`scan_and_decode(width, height, luma) -> Option<ScanOutcome>` ejecuta todo el proceso dentro de `src/fws/scanner.fws` y
devuelve la **carga útil decodificada** directamente (`value` está vacío cuando se encuentra un símbolo pero no se puede decodificar). La fachada JS
(`scanner/index.ts`) es una capa de clasificación delgada que vincula las fuentes FWS de códigos de barras, matrices y QR en el momento de la compilación;
esos paquetes siguen siendo publicables de forma independiente.

#### ¿Por qué esto es manejable ahora?

Las cajas del decodificador ya exponen núcleos Rust y `crates/code-scan`
**ya los vincula para sus pruebas nativas** (`tests/pipeline.rs` llama
`mission_platform_barcode_decode::decode_modules`,
`mission_platform_matrix_code_decode::decode`, etc.). La única razón por la que están confinados a
`[target.'cfg(not(target_arch = "wasm32"))'.dev-dependencies]` es que cada caja decodificadora exporta un
`#[wasm_bindgen] pub fn decode`, y vincular varios de ellos en un cdylib chocaría con el `decode` exportado.
símbolo.

La solución fue una pequeña refactorización mecánica: **los cuatro pasos ya están realizados**:

1. **Cada decodificador tiene un punto de entrada simple de Rust** que _no_ es `#[wasm_bindgen]`
   (`decode_modules`, `decode_matrix`, `decode_qr`) y `#[wasm_bindgen]`
   Las exportaciones `decode`/`start` están cerradas detrás de una nueva función de caja `wasm-api` (activada de forma predeterminada e implícita en `console`).
2. **`code-scan` depende de las cajas del decodificador con `default-features = false`**
   (por lo que `wasm-api` está desactivado), promovido de dependencias de desarrollo a dependencias reales. No hay ningún símbolo `decode` de wasm-bindgen
   compilado en el cdylib del escáner, para que no haya conflictos; se verifica reconstruyendo el wasm del escáner.
3. **`scan_and_decode`** en `crates/code-scan/src/lib.rs` localiza y luego llama a los núcleos Rust simples de los decodificadores en proceso
   y devuelve un formato `ScanOutcome {,
valor }` (a `#[wasm_bindgen]` struct; `valor` is `undefinido` cuando no se puede decodificar).
4. **La fachada JS se ha adelgazado**: el enrutamiento `decodeTagged` y las importaciones de los tres paquetes de decodificadores desaparecieron.
   reemplazado por una única llamada `scan_and_decode`.

Este es el paso habilitante para todas las mejoras de precisión que se detallan a continuación, porque la localización y la decodificación ahora comparten un espacio de direcciones.

## 2. Las mejoras de precisión se desbloquean una vez que la decodificación está en Rust.

Ordenados aproximadamente según el impacto esperado en la tasa de lectura. **Los elementos 1 a 3 (Fase 2) y los elementos 4 a 7 (Fase 3) están terminados**; cada uno es
comentado a continuación.

1. **Localizador ↔ bucle de reintento del decodificador. _(hecho - Fase 2.)_** Cuando falla el primer intento de decodificación, `scan_and_decode`
   vuelve a muestrear sin salir de Rust: intenta una segunda binarización (adaptativa), cambios de origen del submódulo
   (`SAMPLE_OFFSETS`), y decodificación ciega y con reconocimiento de borrado, aceptando el primer candidato que pase la prueba del símbolo.
   propia corrección de errores. Esto ataca directamente las fallas _ubicadas-pero-no codificables_.
2. **Binarización local/adaptativa. _(hecho — Fase 2.)_** `image::binarize` (global **Otsu**) se mantiene como el primero rápido
   intento; `image::binarize_adaptive` agrega un umbral de ventana **media C** local (a través de una imagen integral) para que deslumbre,
   Los degradados y la iluminación desigual ya no fusionan los módulos oscuros con el fondo. El ciclo de reintento intenta ambos.
3. **Muestreo de módulo de nivel de grises (subpíxeles). _(hecho - Fase 2.)_** `qr` y
   `datamatrix` obtuvo `scan_with_confidence`, que muestra los centros de los módulos de la imagen _gris_ con bilineal
   interpolación y marca los módulos cerca del umbral local como de baja confianza. Esos se pasan a los decodificadores.
   (`decode_qr_with_erasures` / `decode_matrix_with_erasures`) como Reed–Solomon **borra**, que el
   corrector de errores y borrados (`gf`, `reed_solomon`)
   repara hasta el doble de la tasa de errores desconocidos.
4. **Robustez multiescala + rotación para 1D y Data Matrix. _(hecho - Fase 3.)_** El localizador QR ya estaba
   tolerante a la rotación a través de sus tres centros de búsqueda. Data Matrix ahora lee en **cualquier** rotación: un afín basado en esquinas
   localizador (`scan_oriented_candidates`: cuatro esquinas de tinta extremas, la esquina L detectada desde sus bordes solid, la
   esquina opuesta reconstruida por la regla del paralelogramo, tamaño leído en los bordes de sincronización, muestreado a lo largo de independientes
   ejes de columna/fila para que también se maneje el corte)
   cubre ángulos moderados, y un retroceso de enderezar y reintentar recupera ángulos pronunciados: `Bitmap::orientation` encuentra el
   rotación a través de un barrido de cuadro delimitador de área mínima (robusto en la familia de 45°, donde las esquinas de los puntos extremos degeneran),
   `image::rotate_luma` endereza el marco y la tubería vertical sintonizada lo prueba. Los códigos de barras 1D se manejan
   De la misma manera: se recupera la inclinación y se endereza el marco (se intentaron las cuatro orientaciones de alineación de ejes) para que el
   Las líneas de exploración horizontales cruzan las barras. Cubierto por pruebas de tuberías de captura rotada en una variedad de ángulos (incl.
   45°/90°/180°+) y los perfiles de degradación JS reforzados.
5. **Desambiguación de simbología para 1D. _(hecho - Fase 3.)_** La ambigüedad UPC-A versus cero inicial EAN-13 se resuelve mediante
   el **dígito del sistema numérico**:
   `decode_any_barcode` posprocesa la simbología ganadora mediante
   `disambiguate_symbology`, que informa un EAN-13 cuyo dígito del sistema numérico es
   `0` como el formulario UPC-A de 12 dígitos (sin ceros iniciales), dejando intacto el EAN-13 genuino. _Restante:_ llevando
   Estructura ubicada más rica (posiciones de las barras de protección, recuento de elementos) en la decisión y exposición de la simbología prevista.
   para que las personas que llaman puedan restringirlo.
6. **Apoyo azteca. _(hecho - Fase 3.)_** El `@mission-platform/matrix-code`
   El codificador ya producía Aztec, pero el escáner no tenía _localizador_ Aztec. Se agregó un localizador de diana azteca compacto
   (`crates/code-scan/src/aztec.rs`): encuentra la diana central mediante su firma de buscador `1:1:1:1:1:1:1:1:1` de nueve carreras
   (siete ejecuciones internas confiables, dos externas solo se requieren presentes ya que tocan el anillo de modo), lo verifica en ambos ejes,
   recupera el tamaño del módulo, toma muestras de cada tamaño compacto plausible (15/19/23/27) en una copia limpia y enruta cada uno
   a la ruta de decodificación azteca existente, cuyas comprobaciones de modo-mensaje + Reed-Solomon rechazan los tamaños incorrectos. `scan_and_decode`
   lo reporta como `FORMAT_AZTEC`.
7. **Escaneo de múltiples símbolos + ROI. _(hecho - Fase 3.)_** `scan_and_decode_all`
   devuelve cada símbolo decodificado distinto (un barrido de grueso a fino de todo el fotograma, superponiendo mitades y cuadrantes,
   deduplicado por `(format, value)`), y
   `scan_and_decode_roi` recorta una región proporcionada por la persona que llama **en Rust antes**
   binarización, por lo que un recorte de retícula rechaza el desorden circundante desde el principio. Ambos están revestidos en la fachada JS.
   (`scanImageDataAll`, `scanImageData(image, roi)`).

## 3. Estrategia de validación

La precisión del trabajo debe medirse, no afirmarse visualmente.

- **Pruebas de ida y vuelta con imágenes generadas.**
  `src/scanner/index.spec.ts` genera muchas salidas de codificador: cinco cargas útiles QR en todos los tamaños/UTF-8 más los cuatro ECC
  niveles, cuatro cargas útiles de Data Matrix y siete simbologías 1D (`code128`, `code39`, `ean13`, `ean8`, `upca`, `itf`,
  `codabar`) y afirma la ruta `render → locate → sample → decode` completa (ahora la única
  llamada `scan_and_decode`) recupera la carga útil. Los casos 1D se comparan con la precedencia de simbología propia del escáner.
  (incluida la desambiguación UPC-A/EAN-13).
- **Todos los tipos de códigos codifican↔decodifican ida y vuelta.** `crates/code-scan/tests/generated.rs`
  codifica **cada** simbología que los codificadores pueden producir: QR (4 niveles ECC), las cuatro simbologías matriciales (Data Matrix
  cuadrado/rectangular, GS1 Data Matrix, Aztec)
  y las quince simbologías 1D (incluido el Código 93, GS1-128, UPC-E, ITF-14, MSI, Pharmacode) y afirma que cada una decodifica
  fielmente (recodificar igualdad), cubriendo los tipos de código que el escáner aún no puede _localizar_.
- **Casos de degradación de fase 2.** `image.rs` pruebas unitarias de binarización adaptativa en un gradiente de iluminación; `tests/pipeline.rs`
  demuestra que un QR degradado por gradiente que la ruta global de Otsu no puede leer se recupera mediante el adaptativo de Fase 2 +
  tubería de muestreo de grises; las cajas RS prueban la recuperación de errores y borrados más allá de la capacidad de error ciego.
- **Degradación de captura por formato inicializada.** Cada imagen generada se deforma mediante un **proyectivo** determinista.
  transformar: escala de aspecto no uniforme, rotación, sesgo y una **morfología** x/y/z independiente por esquina (una homografía) —
  más ruido de sal y pimienta, antes de escanear. Las intensidades se sintonizan por formato, lo que cuantificó dos límites del localizador.
  vale la pena arreglarlo (ver §2): la cuadrícula basada en el buscador de QR es solo afín, por lo que tolera solo un aspecto _anisotrópico_ leve y
  _perspectiva_ antes de que los símbolos más grandes se desvíen; El localizador Data Matrix está solo en posición vertical, por lo que solo tolera una ligera
  rotación/inclinación/morfología.
- **Matriz de degradación.** El Rust `tests/pipeline.rs` ya degrada las capturas sintéticas (de escala reducida, sal y pimienta).
  motas, desorden en la zona tranquila, una zona abarrotada
  "marco de la cámara"). Amplíe esto a un barrido de parámetros (escala × ruido × rotación × desenfoque) e informe una **velocidad de lectura
  porcentaje por formato**, cerrado en CI para que un cambio no pueda hacer una regresión silenciosa.
- **Corpus de captura real.** Recopile un conjunto fijo de fotografías reales (los informes de campo hacen referencia a fotogramas de baja resolución de 448 × 336).
  y ~3px/códigos de barras de módulo) con cargas útiles conocidas y realizar un seguimiento de la velocidad de lectura como métrica principal en todas las versiones.
- **Determinismo.** Mantenga todas las degradaciones sintéticas sembradas (el `speckle` existente
  utiliza un LCG fijo) para que los resultados sean reproducibles.

## 4. Secuenciación sugerida

1. **Fase 0: pruebas (terminadas).** Se amplió el conjunto de imágenes generadas (con aspecto/rotación/inclinación/morfología/ruido inicializados).
   degradación) por lo que el oleoducto tenía una red de seguridad antes de la refactorización.
2. **Fase 1: consolidar la decodificación en Rust (hecho).** La refactorización de dependencia/función + `scan_and_decode` + fachada JS
   adelgazar. Preservación del comportamiento; validado por las pruebas de ida y vuelta, pipeline y nuevo `scan_and_decode`, y por
   Reconstrucción del escáner wasm.
3. **Fase 2: binarización + muestreo de subpíxeles + bucle de reintento (hecho).** Binarización local adaptativa, bilineal gris
   muestreo con confianza por módulo alimentado a los decodificadores como borrados de Reed-Solomon, y el × global → adaptativo
   bucle de reintento de borrado/ciego × compensación de origen en `scan_and_decode`: la mayor velocidad de lectura gana, ahora que la localización y
   decodificar coopera en una llamada de Rust.
4. **Fase 3: rotación/inclinación, desambiguación de simbología, azteca, multisímbolo (en progreso).** La simbología 1D
   ha llegado la desambiguación (§2 punto 5). Restante:
   Tolerancia de sesgo de rotación Data Matrix/1D (elemento 4), un localizador azteca (elemento 6) y escaneo de múltiples símbolos + ROI (elemento 7): cada uno aterrizó detrás de su propio delta de matriz de degradación.

## 5. Seguimiento de la documentación

- **Listo:** `packages/integrations/code-scanner/README.md` fue actualizado: el decodificador de código de barras 1D obsoleto sigue siendo un andamio, por lo que
  Los resultados del código de barras llevan la nota `value: null`" se reemplaza con el comportamiento de decodificación de extremo a extremo (decodificación de códigos de barras; UPC-A
  informa como su valor de 12 dígitos, no como su alias EAN-13), y la sección de arquitectura ahora describe el único
  llamada `scan_and_decode` en lugar de la transferencia de decodificación JS.

## 6. Arnés de corpus de caja negra ZXING (velocidad de lectura de captura real)

El "corpus" `tests/real_world.rs` de §3 se realizó como el corpus completo **ZXing blackbox** (1242 PNG en 56
carpetas de simbología, cada una con un `.txt`
valor esperado; Apache-2.0, vendido bajo
`crates/code-scan/tests/fixtures/zxing-blackbox/` con atribución). Un arnés estilo ZXing
(`crates/code-scan/tests/blackbox.rs`) ejecuta todo el sistema nativo
`scan_and_decode` canaliza cada imagen en las cuatro rotaciones de un cuarto de vuelta (0/90/180/270) y compara cada una
recuento de pases por carpeta y por rotación respecto de una línea de base confirmada (`tests/blackbox_baseline.toml`), que falla solo en un
_regresión_: de modo que los valores atípicos que no se pueden corregir nunca bloquean el progreso mientras se miden las ganancias genuinas. `falsepositives*` /
Las carpetas `unsupported` son la protección inversa: su línea de base es un _techo_ de falsos positivos.

### Paso 1: corpus + cargador generalizado + arnés _(hecho)_

Se vende el corpus, se generaliza el lector PNG (`tests/support/png.rs`:
tipo de color de paleta 3 en profundidades 1/2/4/8, escala de grises de baja profundidad, RGB (A), gris+alfa, además de ayudantes de rotación 90/180/270
que coincida con la semántica de ZXing) con una prueba unitaria del cargador (`tests/png_loader.rs`) y se confirma la línea de base.

### Paso 2: aumentar la velocidad de lectura en formatos compatibles _(en curso)_

Triaje (clasificación por carpeta de cada imagen/rotación como decodificada/valor incorrecto/ubicada pero no decodificada/
no ubicado) surgió un patrón claro:
la tubería ahora **localiza casi todo** pero **decodifica solo las capturas limpias**. Los fracasos restantes son
abrumadoramente _ubicados-pero-no-decodificados_, no _no-ubicados_.

**Conseguí este paso:**

- **Guardia de falso positivo ITF.** Intercalado-2-de-5 no tiene dígito de control y tiene un inicio/parada trivial, por lo que se cruza una línea de exploración
  un símbolo no relacionado (un QR, otras barras) trivialmente "decodificado" a un valor falso de 2 o 4 dígitos. `itf::decode` ahora
  rechaza cargas útiles de menos de **seis dígitos**, que coinciden con el límite inferior de `ITFReader::DEFAULT_ALLOWED_LENGTHS` de ZXing
  (`{6,8,10,12,14}`). Esto llevó a que los falsos positivos en `falsepositives`, `falsepositives-2` y `unsupported`
  **cero** y, al eliminar esas lecturas cortas que estaban provocando un cortocircuito en el orden de precedencia, se eliminaron varias lecturas positivas.
  carpetas (por ejemplo, `qrcode-4`, `qrcode-5`). Cubierto por una nueva prueba de regresión (`barcode-decode`:
  `itf_rejects_runs_shorter_than_six_digits`) y la actualización de referencia.

**Próximas oportunidades cuantificadas (ubicadas, aún no decodificadas):**

- **Decodificación de filas 1D por dígito (mayor oportunidad).** Las carpetas UPC/EAN ubican cientos de líneas de escaneo pero decodifican casi
  ninguna de las fotos de la cámara dura (`upca-2` 206 ubicada / 0 decodificada, `upce-2` 160/0, `ean13-3` 204/6). La causa raíz
  es que el localizador cuantifica cada línea de exploración en una **unidad de módulo global única** antes de entregar los bits del módulo al
  decodificador; bajo perspectiva, el ancho real del módulo varía a lo largo del símbolo, por lo que la cuadrícula global se desplaza
  y una rígida cuadrícula de celdas EAN/UPC lo rechaza. La solución es un decodificador de fila **por dígito** estilo ZXing que coincide con el de cada dígito.
  relaciones de longitud de ejecución localmente (varianza de coincidencia de patrón) en lugar de una cuantificación global: un cambio mayor en el
  interfaz localizador↔decodificador, rastreada como la siguiente iteración del Paso 2.
- **Perspectiva QR/muestreo de patrón de alineación.** `qrcode-1` (77 localizados/0 decodificado) y `qrcode-6` (60/0) son
  Símbolos de versión superior: el muestreador construye una cuadrícula puramente **afín** a partir de los tres centros del buscador, que se desplaza a través de
  un símbolo grande o con perspectiva deformada. Usando el **patrón de alineación** de la parte inferior derecha
  para una transformación de perspectiva de cuatro puntos (como lo hace `Detector` de ZXing) es la ganancia QR correspondiente.
- **Tamaño de la matriz de datos + polaridad.** La matriz de datos única `inverted` ahora se encuentra después de un cambio de polaridad, pero
  el localizador tiene un tamaño incorrecto (22×22 para un símbolo numérico de 10 dígitos cuyo tamaño real es ~12–14), por lo que no se decodifica; un
  Se creó un prototipo del reintento de polaridad invertida de fotograma completo, pero se revirtió para este paso porque duplicó el tiempo de barrido del corpus.
  para ganancias netas de corpus cero (el bloqueador es el tamaño del DM, no la polaridad). El soporte invertido debería regresar una vez que el localizador DM
  El tamaño se ajusta y se limita para que la pasada adicional solo se ejecute en marcos que de otro modo fallarían.
- **Muestreo azteca.** `aztec-1` (68 ubicado / 0 decodificado): se encuentra la diana pero sí el muestreo de cuadrícula alineado con el eje
  Aún no se recuperan estas capturas.

### Paso 3: codificación + decodificación + localizador GS1 DataBar (RSS-14) _(RSS-14 hecho)_

Un nuevo trío de cajas refleja la división `*-common`/`*-encode`/`*-decode` del repositorio:

- **`gs1-databar-common`** — las primitivas combinatorias ISO/IEC 24724 trasladadas desde `RSSUtils` de ZXing: `combins`,
  `get_rss_value` (anchos → valor, decodificar) y su inverso exacto `get_rss_widths` (valor → anchos, codificar), más el
  comparador de buscador de variación de relación de ancho. Una prueba unitaria afirma que el mapeo de valor/ancho es autoinverso en cada RSS-14
  subconjunto.
- **`gs1-databar-decode`** — un puerto fiel de `RSS14Reader` de ZXing: detección de buscador, `parseFoundFinderPattern`,
  `decodeDataCharacter` (con el ajuste de conteo par/impar) y la suma de comprobación mod-79, reconstruyendo el GTIN de 14 dígitos.
  Debido a que los caracteres de DataBar se decodifican a partir de _ratios_ de ancho de elemento (no una cuadrícula de glifos fija), las lecturas del decodificador de fila se ejecutan
  longitudes directamente de una línea de escaneo, por lo que tolera el ancho de módulo variable de una captura en escorzo que anula
  la ruta 1D de cuantificación global (§2).
- **`gs1-databar-encode`** — el valor→módulo-bit inverso. Su disposición física (barra de guardia, elemento exterior/buscador/interior
  orden y el par interior/derecho invertido) se definió comparando los anchos de elementos medidos por el decodificador desde un
  símbolo de corpus real contra los caracteres calculados del codificador, luego confirmado mediante un viaje de ida y vuelta de codificación → decodificación.

El escáner obtuvo `crates/code-scan/src/gs1_databar.rs`, un localizador delgado que genera líneas de escaneo prometedoras
(filas de transición más ocupadas, luego columnas para capturas de 90°/270°) al decodificador de filas; la fuerte suma de comprobación RSS-14 hace un
coincidencia autorizada, por lo que informa solo un valor decodificado o nada (manteniendo limpia la protección de falsos positivos). esta cableado
en `scan_and_decode` como nuevo
Etiqueta `FORMAT_DATABAR` (con `FORMAT_PDF417` / `FORMAT_MAXICODE` reservada para pasos posteriores).

**Resultado:** las carpetas del corpus `rss14-1` y `rss14-2` pasaron de **0 → 16**
decodificaciones correctas en las cuatro rotaciones (las filas leen 0°/180°, las columnas leen 90°/270°), sin **ninguna regresión** en ninguna
La otra carpeta y las carpetas negativas todavía tienen **cero** falsos positivos. Los viajes de ida y vuelta están cubiertos por
`gs1-databar-decode/tests/roundtrip.rs` y `code-scan/tests/generated.rs`.

**Próxima iteración de DataBar:** GS1 DataBar **Expandida** y **Expandida-Apilada**
(`rssexpanded-*`, `rssexpandedstacked-*`) son un decodificador independiente y más grande (un analizador de campo/IA de uso general más
conjunto de filas apiladas) y permanecer en la línea base 0, seguido como seguimiento de este paso. RSS-14 **Apilado** también necesita
Conjunto de dos filas en el localizador.

### Paso 4: codificación + decodificación PDF417 + localizador de filas apiladas _(hecho)_

Un nuevo trío de cajas refleja la división `*-common` / `*-encode` / `*-decode` del repositorio, trasladando `com.google.zxing.pdf417.*`
(Apache-2.0):

- **`pdf417-common`** — las tablas compartidas y las matemáticas de ambos lados necesitan: el símbolo ↔ tablas de palabras clave (2787 entradas,
  generado a partir de la referencia de ZXing), las búsquedas de palabras clave/clúster (`get_codeword`, `bucket_from_symbol`), el
  module-bit-count → muestreador de símbolos (ruta rápida exacta más un respaldo de relación más cercana construido de manera perezosa), y el **GF (929)
  Decodificador de corrección de errores Reed-Solomon** (`ModulusGF` / `ModulusPoly` / algoritmo euclidiano). Una prueba unitaria afirma cada
  El valor de la palabra clave tiene un símbolo en cada uno de los tres grupos y viajes de ida y vuelta.
- **`pdf417-decode`** — Corrección EC GF (929) más un analizador de flujo de bits de alto nivel (`DecodedBitStreamParser`) que cubre
  **Texto**, **Byte** y **Numérico**
  compactación. Consume la matriz de palabras de código plana que ensambla el localizador y devuelve la carga útil.
- **`pdf417-encode`** — un codificador de compactación de bytes (cualquier carga útil de bytes viaja de ida y vuelta exactamente), dimensionamiento de dimensiones,
  Generador de palabras en código EC (`EC_COEFFICIENTS` para los nueve niveles EC, generado a partir de la referencia) y la matriz del módulo
  disposición (guardias de inicio/parada, indicadores de fila izquierda/derecha). Expone tanto la matriz de palabras en código (para nivel de palabra en código)
  viajes de ida y vuelta) y el mapa de bits del módulo empaquetado (para pruebas de ruta de imagen).

El escáner obtuvo `crates/code-scan/src/pdf417.rs`. PDF417 es un _lineal apilado_
simbología, por lo que el localizador trabaja una línea de escaneo a la vez: en cada fila de imagen encuentra la guardia de inicio, lee 17 módulos
palabras clave (8 barras/espacios cada una) hasta el tope de guardia, vota los metadatos de columna/recuento de filas/nivel EC de la fila
indicadores, coloca las palabras en clave de datos en una matriz `rows × cols` (votada por mayoría por celda en las líneas de escaneo que
cubre cada fila de código de barras) y lo entrega al decodificador con verificación RS. Una segunda pasada lee cada fila de derecha a izquierda para que
El símbolo girado 180° todavía se decodifica. Está conectado a `scan_and_decode` como `FORMAT_PDF417`.

Dos detalles de robustez resultaron esenciales:

- **Muestreo solo exacto en la ruta activa.** El muestreador por ejecución utiliza solo la coincidencia exacta
  (`sample_codeword_symbol_exact`); una ejecución que no muestra limpiamente se convierte en un _agujero_ `-1` que conserva la columna
  alineación y se omite en la votación. Esto sigue escaneando cada fila de cada imagen de forma económica: la O (tamaño de tabla)
  De lo contrario, el retroceso de proporción más cercana dominaría el barrido del corpus.
- **Un protector de agujeros contra la sobrecorrección de RS.** Con niveles altos de EC, Reed–Solomon estará encantado de fabricar un
  Palabra de código _válida pero incorrecta_ de un ensamblado casi vacío (observado como decodificaciones `"AAAA…"` basura). El localizador por lo tanto
  se niega a decodificar cuando el número de agujeros excede `num_ec / 2` (el presupuesto de corrección RS), que eliminó **todos**
  decodifica basura manteniendo todas las correctas y mantiene limpia la protección de falsos positivos de la carpeta negativa.

Un error solucionado en el camino: el brazo predeterminado del analizador de flujo de bits podría girar para siempre en un flujo corrupto (volver a ejecutar texto
compactación en una palabra clave que no puede consumir); ahora se retira cuando no avanza.

**Resultado:** `pdf417-1` / `pdf417-2` / `pdf417-3` pasó de **0 → 8/13/8**
decodificaciones correctas en la rotación 0, y nuevamente a 180° (**58** correctas entre rotaciones), sin **regresión** en ningún otro
carpeta y las carpetas negativas todavía en **cero** falsos positivos. Los viajes de ida y vuelta están cubiertos por
`pdf417-decode/tests/roundtrip.rs` y `code-scan/tests/generated.rs`, y la ruta completa de la imagen (codificar → renderizar →
`scan_and_decode`, incl. 180°) por
`code-scan/tests/pipeline.rs`.

**Próxima iteración de PDF417:** las rotaciones **90°/270°** permanecen en la línea base 0: un símbolo de un cuarto de vuelta se presenta como barras verticales
que el localizador de escaneo de filas no lee. Un pase de escaneo de columnas (transposición), o el arnés que alimenta el marco transpuesto, es
el seguimiento correspondiente. Una inclinación más pronunciada necesitaría el modelo de perspectiva `Detector` de cuatro esquinas ZXing completo.

### Paso 5: codificación + decodificación MaxiCode + localizador hexagonal _(hecho)_

Un nuevo trío de cajas refleja la división `*-common` / `*-encode` / `*-decode` del repositorio, trasladando `com.google.zxing.maxicode.*`
(Apache-2.0):

- **`maxicode-common`** — las primitivas compartidas que ambos lados necesitan: la geometría del símbolo fijo (30 columnas × 33 filas), el
  **`BITNR`** por celda → mapa de bits de palabra clave (puerto de `BitMatrixParser.BITNR` de ZXing, transcrito y probado por unidad para que cada
  de los 864 bits de datos aparece exactamente una vez), el `read_codewords` / `place_codewords`
  par inverso y el corrector **GF (64) Reed–Solomon** (primitivo `x⁶+x+1`, generador base 1) con errores únicamente
  Berlekamp–Massey/Chien/Forney. Las pruebas unitarias cubren una palabra clave limpia, corrección de hasta la mitad del presupuesto de la CE y una
  bloque incorregible.
- **`maxicode-decode`** — una versión fiel del `Decoder` de ZXing +
  `DecodedBitStreamParser`: corrige el bloque primario (10 datos + 10 EC en su conjunto) y el bloque secundario (par/impar).
  entrelazados corregidos de forma independiente), lee el modo nibble, ensambla las palabras de datos y ejecuta el conjunto de cinco
  (`SETS[0..5]`) secuencia de retención/desplazamiento/compactación numérica, incluida la portadora estructurada en modo 2/3
  conjunto de código postal/país/clase de servicio. Debido a que los tres bloques RS deben validarse, un valor devuelto tiene autoridad.
- **`maxicode-encode`**: un modo de orientación de escritor sin dependencia 4/5 con los conjuntos de caracteres principales A y B (suficientes para
  codificar cargas útiles ASCII y generar los viajes de ida y vuelta), generando el EC primario + secundario entrelazado y colocando el 144
  palabras en clave en la cuadrícula del módulo a través del mapa compartido `BITNR`.

El escáner obtuvo `crates/code-scan/src/maxicode.rs`. MaxiCode se lee como un símbolo _puro_, exactamente como el de ZXing
`MaxiCodeReader` hace: el localizador toma el rectángulo circundante de los píxeles oscuros y muestra la cuadrícula fija de 30 × 33
sobre él, desplazando la posición x de la muestra medio módulo en filas impares para seguir el desplazamiento hexagonal. Un aspecto cuadrado barato
la guardia omite regiones obviamente que no son MaxiCode (códigos de barras 1D, etiquetas altas) antes del muestreo, y los tres bloques RS rechazan
cualquier imagen que no sea MaxiCode muestreada de esta manera. Está conectado a `scan_and_decode` como
`FORMAT_MAXICODE`.

**Resultado:** la carpeta `maxicode-1` pasó de **0 → 9** a decodificaciones correctas en la rotación 0 (las nueve imágenes, modos 2 a 5 y
la muestra inyectada con error), con **sin regresión** en ninguna otra carpeta y las carpetas negativas aún en **cero**
falsos positivos. Los viajes de ida y vuelta están cubiertos por `maxicode-decode/tests/roundtrip.rs`.
(codificar → cuadrícula de módulos → decodificar, incluida la recuperación de errores RS) y
`code-scan/tests/generated.rs`.

**Próxima iteración de MaxiCode:** al igual que ZXing, el muestreador de bits puros está solo en posición vertical, por lo que las rotaciones **90°/180°/270°** permanecen en
línea de base 0 (un símbolo girado muestra la cuadrícula hexagonal incorrectamente y RS la rechaza; no hay falsos positivos). una diana
El buscador que recupera la rotación del símbolo antes del muestreo levantaría las otras tres rotaciones.

### Paso 6: conecte los nuevos formatos a la fachada JS + cree el artefacto FWS _(hecho)_

Los pasos 3 a 5 colocaron PDF417, GS1 DataBar (RSS-14) y MaxiCode en el escáner
tubería detrás de las etiquetas `FORMAT_PDF417` / `FORMAT_DATABAR` / `FORMAT_MAXICODE`, mientras que la fachada JS solo conocía la
cuatro formatos originales. Este paso muestra las nuevas simbologías en tiempo de ejecución:

- **`FORMAT_NAMES`** en `src/scanner/index.ts` ahora asigna `4 → 'pdf417'`,
  `5 → 'databar'`, `6 → 'maxicode'` y el sindicato `ScanFormat` en `src/types.ts`
  gana los mismos tres nombres, por lo que `scanImageData` / `scanImageDataAsync` (y el
  `*All` / variantes ROI) los devuelven como cualquier otro formato.
- **El artefacto FWS del escáner está creado** a partir de `src/fws/scanner.fws` mediante el complemento Vite de Forge Web Script. El perfil estático
  vincula los gráficos del decodificador en un artefacto autónomo, habilita WebAssembly SIMD y aplica un tiempo de enlace agresivo
  optimización; el perfil dinámico mantiene límites explícitos del módulo decodificador y almacena en caché el envío de exportaciones.
- **El gráfico FWS y las suites de fachada** (`src/fws/scanner-graph.spec.ts` y
  `src/scanner/index.spec.ts`) ejercita los gráficos del decodificador vinculado a través del
  escáner ABI y ambos puntos de entrada públicos, incluidos PDF417, GS1 DataBar,
  Rutas MaxiCode, ROI, multiresultados, sincrónicas y asincrónicas. el
  El accesorio de texto PDF417 local del paquete mantiene el caso de conformidad independiente de
  el espacio de trabajo del corpus nativo retirado.

**Resultado:** `vitest` es verde frente al artefacto FWS y la compilación `tsc`
el cheque está limpio. Las familias apoyadas siguen cubiertas exhaustivamente por el
conjuntos de gráficos y fachadas públicas, y la clasificación por niveles del modelo por etapa que guió el
El esfuerzo está documentado en `docs/model-cost-strategy.md`.

### Paso 7: Decodificador de fila 1D por dígito estilo ZXing para fotos UPC/EAN de cámara _(hecho)_

El modo de falla dominante del corpus restante fueron los códigos de barras 1D **ubicados pero no decodificados**. El camino 1D original
(`barcode.rs` → `barcode-decode`) muestrea cada línea de exploración candidata en una serie plana de bits de módulo cuantificando cada
ejecutar contra una **unidad de módulo global única**. Eso es exacto en una carga limpia, pero en una foto de cámara el ancho del módulo es
no es constante en todo el símbolo (la perspectiva, el desenfoque y la impresión desigual lo estiran), por lo que una unidad global redondea muchas
elementos contra la cuadrícula incorrecta y el rígido decodificador de celdas EAN/UPC rechaza el resultado. El símbolo está _ubicado_ (`scan`
devuelve líneas de escaneo candidatas) pero nunca _decodificadas_.

La solución es un nuevo `crates/code-scan/src/barcode_row.rs`, una fiel adaptación de la familia `UPCEANReader` de ZXing. nunca
cuantifica en una cuadrícula global: recorre la línea de exploración patrón por patrón y, para **cada dígito de forma independiente**, normaliza
los cuatro anchos de corrida de ese dígito a la celda de siete módulos antes de compararlo con las tablas de ancho L/G/R
(`patternMatchVariance` con `MAX_AVG_VARIANCE` /
`MAX_INDIVIDUAL_VARIANCE`). Debido a que cada dígito lleva su propia unidad local, la deriva gradual a través del símbolo ya no
derrota la lectura. Cubre **EAN-13 / UPC-A** (a través de EAN-13, con el dígito principal recuperado de las seis mitades izquierdas
bits de paridad), **EAN-8** y **UPC-E** (que antes no tenían ruta de decodificación; está ausente en `barcode-decode`).
lista de simbología), reutilizando el detector de banda de código de barras compartido para seleccionar las filas de escaneo. Se ejecuta en `decode_barcode_frame` como
respaldo **después** de que falla el decodificador de grid, por lo que las cargas limpias mantienen la ruta rápida.

Dos guardias mantienen las carpetas negativas en **cero** falsos positivos: el lector es mucho más permisivo que la cuadrícula
cuantizador, por lo que ambos eran esenciales:

- **Zonas silenciosas en ambos lados.** ZXing requiere una zona silenciosa trasera al menos tan ancha como la protección final (reflejando la
  zona tranquila de guardia de salida existente). Sin él, un `1:1:1` se ejecuta _dentro_ de un símbolo no relacionado que enmarca un "código de barras" falso
  que, combinado con una suma de verificación coincidentemente válida, decodifica: la fuente de los 9 + 12 falsos positivos iniciales en
  `falsepositives*`.
- **Consenso de varias filas para las simbologías cortas.** Los EAN-8/UPC-E de 8 dígitos son propensos a una suma de verificación válida por casualidad
  enmarcados en desorden, por lo que se aceptan solo cuando **≥ 2 filas de escaneo** decodifican de forma independiente el mismo valor (un valor genuino
  el código de barras se decodifica en muchas filas de la altura de la barra; aparece una casualidad en uno). El EAN-13 / UPC-A de 13 dígitos (12 dígitos de datos
  más el primer dígito derivado de la paridad)
  son mucho menos propensos y se aceptan de una sola fila. Cada valor devuelto es validado adicionalmente por el símbolo
  propia suma de comprobación mod-10.

**Resultado:** en las carpetas UPC/EAN, la rotación 0 aumentó bruscamente, p.
`ean13-3` **3 → 54**, `upca-2` **0 → 31**, `upce-2` **0 → 37**, `upca-5`
**13 → 26**, más `ean13-1`, `ean8-1`, `upca-1`, `upce-1/3` y, debido a que el respaldo también se ejecuta en el
enderezar y volver a intentar marcos, ganancias comparables a 90°/180°/270° (por ejemplo, `upce-2` rot90 **0 → 35**). **No** otra carpeta
retrocedió y las carpetas negativas (`falsepositives`, `falsepositives-2`, `unsupported`) permanecen en **cero** falso
positivos. Dos pruebas de regresión respaldadas por corpus en
`code-scan/tests/pipeline.rs` bloquea las lecturas de fotografías reales UPC-E/EAN-13/EAN-8 y la protección limpia contra falsos positivos, y el JS
smoke suite obtiene fotos de cámara UPC-E + EAN-13 a través de las rutas de carga y transmisión.

**Nota: `img.png`.** La captura del mundo real de la raíz del espacio de trabajo (`real_world.rs`) ahora está _ubicada_ limpiamente, pero codifica
la muestra del generador clásico `01234567`
cuyo dígito final **no** es una verificación mod-10 válida (`0123456` → `01234565`). Un lector que cumple con las especificaciones: éste y
ZXing mismo: rechaza un código de barras que no supera su propia suma de verificación, por lo que la canalización no devuelve ningún valor allí _por diseño_; eso
La prueba permanece `#[ignore]` como documentación del rechazo intencional (dejar caer el protector de suma de verificación para leerlo sería
volver a abrir los falsos positivos que elimina la guarda).

**Próxima iteración 1D:** extensiones **complementarias** UPC/EAN (`upcean-extension-*`, los suplementos de 2/5 dígitos) y las más difíciles
Las carpetas (`upca-6`, `ean13-5`) permanecen en la línea base 0: el lector complementario y un localizador más potente para esas capturas son los
seguimientos coincidentes.
