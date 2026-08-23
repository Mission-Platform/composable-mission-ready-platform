# @mission-platform/barcode

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/barcode/docs/index.md: [packages/barcode/docs/index.md](../../index.md)
> Idioma: Español (es)

Un codificador y decodificador de códigos de barras **1D (lineal)** libre de dependencias escrito en Rust y compilado en **WebAssembly**, expuesto
a través de un pequeño contenedor de módulo ES completamente tipado y un componente de interfaz de usuario `ForgeBarcode` de una sola escritura.

## Descripción general

`@mission-platform/barcode` proporciona codificación y decodificación de alto rendimiento para códigos de barras lineales 1D:

- **Codificador**: representa simbología + carga útil en una serie plana de bits de módulo (`1` = barra, `0` = espacio).
- **Decodificador**: lee una ejecución de módulo limpia de cualquier simbología compatible en su carga útil.
- **Componente UI (`ForgeBarcode`)**: Componente de escritura única compilado para Vue 3, React, Solid y componentes web, todos
  servido desde el especificador `@mission-platform/barcode` simple a través de las condiciones de exportación `mp:<framework>`.

## Simbologías admitidas

| Simbología | Notas |
| ------------ | ---------------------------------------------------------------------- |
| `code128` | Densidad alta. Código B para ASCII imprimible; Código C vía rápida para dígitos. |
| `gs1-128` | Código 128 con FNC1 inicial para Identificadores de Aplicación GS1.            |
| `code39` | Alfanumérico, autocomrobable; autoencuadrado con `*` inicio/parada.          |
| `code39ext` | Código ASCII completo 39 mediante caracteres de desplazamiento.                               |
| `code93` | Compacto, autocomprobable (dos caracteres de verificación).                         |
| `code93ext` | Código ASCII completo 93 mediante caracteres de desplazamiento.                               |
| `ean13` | 12 dígitos (cheque adjunto) o 13 (cheque verificado).                     |
| `ean8` | 7 dígitos (cheque adjunto) u 8 (cheque verificado).                       |
| `upca` | 11 dígitos (cheque adjunto) o 12 (cheque verificado).                     |
| `upce` | UPC con supresión de cero; Forma de 6 dígitos o 7/8 dígitos.                       |
| `itf` | Intercalado 2 de 5; Se requiere un recuento par de dígitos.                         |
| `itf14` | GTIN-14 fijo de 14 dígitos.                                                |
| `codabar` | Dígitos más `-$:/.+`; autoencuadrado con inicio/parada `A`.                 |
| `msi` | MSI / Plessey modificado con verificación mod-10.                              |
| `pharmacode` | Código binario farmacéutico Laetus (`3`–`131070`).                      |

## API y uso

### Codificador y decodificador central (`@mission-platform/barcode`)

```ts
import { decodeBarcode, encodeBarcode } from '@mission-platform/barcode';

// Encode a 1D barcode
const barcode = encodeBarcode('code128', 'MISSION-128');
// barcode.width -> number
// barcode.modules -> number[] (1 = bar, 0 = space)

// Decode back to string
const payload = decodeBarcode('code128', barcode.modules);
```

### Componentes de la interfaz de usuario del marco

No hay una subruta por marco: seleccione el marco **una vez** hasta `resolve.conditions` (consulte
`defineFrameworkAppConfig` / `frameworkResolveConditions` de `@mission-platform/vite-config`) y
`customConditions` (a través de los ajustes preestablecidos de `@mission-platform/typescript-config/framework-<name>`), luego importe
`ForgeBarcode` desde la raíz del paquete.

**Vue 3** (`mp:vue` activo):

```vue
<script setup lang="ts">
  import { ForgeBarcode } from '@mission-platform/barcode';
</script>

<template>
  <ForgeBarcode
    symbology="code128"
    value="MISSION-128"
    :height="60"
  />
</template>
```

**React** (`mp:react` activo):

```tsx
import { ForgeBarcode } from '@mission-platform/barcode';

export function BarcodeViewer() {
  return (
    <ForgeBarcode
      symbology="code128"
      value="MISSION-128"
      height={60}
    />
  );
}
```
