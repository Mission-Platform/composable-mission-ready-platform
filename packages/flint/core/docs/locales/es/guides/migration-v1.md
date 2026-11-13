# Migrar a la canalización FWS segura por defecto

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/flint/core/docs/guides/migration-v1.md: [packages/flint/core/docs/guides/migration-v1.md](../../../guides/migration-v1.md)
> Idioma: Español (es)

Esta guía es para módulos FWS escritos antes de locales inmutables, préstamos explícitos,
y los metadatos de política de límites verificados se convirtieron en parte del contrato v1.

## Hacer explícita la mutación

Agregar `mut` a los locales y parámetros que se le asignan. Agregar `&` por un inmutable
pedir prestado y `&mut` por un préstamo mutable; Los préstamos mutables no pueden superponerse.

```flint
fn increment(mut value: i32) -> i32 {
  value = value + 1;
  value
}

fn inspect(values: &Vector<i32>) -> i32 { values[0] }
fn update(values: &mut Vector<i32>) -> unit { values[0] = 1; }
```

No confíe en la propiedad inferida. Los valores POD se pasan por valor de forma predeterminada;
Los valores que no son POD utilizan referencias inmutables. Mantener `owned`, `borrowed` y `shared`
en los límites de ABI donde se establece una responsabilidad de liberación o de por vida específica
requerido. Una región temporal no se puede devolver ni almacenar en una región de mayor duración.
valor sin un límite explícito de propiedad/promoción.

## Elegir y auditar la política de límites

```bash
flint compile src/main.flint --bounds-checks runtime --format json
```

Utilice `proven-safe` solo cuando el análisis demuestre que todos los accesos desde la longitud de la colección
y hechos del rango del índice. `excluded-by-profile` es una versión explícita y auditable
elección, no un atajo para índices desconocidos:

```bash
flint check src/main.flint --bounds-checks proven-safe --optimizer-report
```

Revise los resultados del análisis y la política del manifiesto antes del envío. Desconocido o
los índices que no son de confianza deben utilizar `runtime`; Un análisis estricto rechaza una política insegura.
solicitudes.

## Inspeccionar metadatos de caché generados

La caché del compilador puede contener `<key>.sonir.json`, un resumen determinista de
el gráfico optimizado Sea-of-Nodes. Inspeccione sin ejecutar el código de invitado:

```bash
flint inspect-sonir .cache/main.sonir.json --format json
```

El artefacto registra versiones de esquema y lenguaje/ABI, hash de fuente y gráfico,
modo de optimización, política de límites, efectos, metadatos de propiedad, intervalos de fuentes,
y ordenó informes de pase. Obsoleto, con formato incorrecto, de gran tamaño o que no coincide con las políticas
los artefactos se ignoran y se pueden eliminar de forma segura.

## Escritura estática estricta y ausencia de tipos dinámicos.

Flint es un lenguaje de tipo estático con un diseño de memoria determinista y cero sobrecarga de reflexión en tiempo de ejecución. El lenguaje no admite tipos superiores dinámicos como `any` o `unknown`.

Al intentar anotar tipos con `any` o `unknown` se produce `FLINT-TYPE-020` de diagnóstico en tiempo de compilación. Para migrar código desde entornos dinámicos:

- Reemplazar valores dinámicos con primitivas concretas (`i32`, `u32`, `f64`, `bool`, `string`, `bytes`).
- Utilice polimorfismo paramétrico/genéricos (`Vector<T>`, `Option<T>`, `Result<T, E>`) para algoritmos de contenedores reutilizables.
- Utilice tipos de datos algebraicos etiquetados (`enum`) para representaciones de dominios polimórficos.
- Para punteros C ABI y identificadores de host opacos, declare `opaque foreign type Handle;` en lugar de punteros sin tipo.
- En puentes y enlaces Web IDL, proporcione asignaciones de tipos explícitas a través de `FlintBindingOptions.customTypeMappings`.

## Comportamiento de memoria y liberación.

Los valores con alcance utilizan regiones marcadas. Los valores que sobreviven a una región utilizan
ARC/asas compartidas; cada manija retenida tiene una liberación coincidente y realiza ciclos
no se aceptan implícitamente. `fws_alloc`, `fws_realloc` y `fws_dealloc` sin procesar
sigue siendo el límite ABI comprobado propiedad de la persona que llama. La suspensión asíncrona e iteradora es
un límite de escape, por lo que los valores utilizados después de la suspensión deben conservarse explícitamente.
