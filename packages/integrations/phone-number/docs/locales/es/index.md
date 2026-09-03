# @mission-platform/phone-number

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/integrations/phone-number/docs/index.md: [packages/integrations/phone-number/docs/index.md](../../index.md)
> Idioma: Español (es)

`@mission-platform/phone-number` es una reimplementación enfocada del núcleo de
google [número de teléfono libre](https://github.com/google/libphonenumber), escrito en
[Guión de ensamblaje](https://www.assemblyscript.org/) y compilado en **WebAssembly**. Analiza, valida, clasifica y
formatea números de teléfono internacionales y está empaquetado como un módulo ES autónomo sin dependencias de tiempo de ejecución.

## Arquitectura

El paquete utiliza una canalización de compilación de AssemblyScript → WebAssembly, impulsada completamente por **Vite**:

1. **Fuente de AssemblyScript** (`assembly/`) contiene metadatos seleccionados por región (`metadata.ts`) y el
   analizar/validar/clasificar/formatear lógica (`index.ts`).
2. **Compilación WASM a través de Vite**: `@mission-platform/vite-plugin-assemblyscript`
   ejecuta el compilador AssemblyScript en el gancho Vite `buildStart`, produciendo
   `build/phone-number.wasm` más enlaces ESM.
3. **Artefacto de archivo único**: el complemento integra el binario wasm como base64 en un
   Módulo `@generated` (`src/generated/phone-number.js`) que expone una fábrica `loadModule()` asíncrona y memorizada:
   eliminando la carga de archivos `.wasm` por separado y la resolución de URL.
4. **Fachada mecanografiada**: `src/index.ts` expone la clase `PhoneNumberUtil` sobre las exportaciones de wasm sin procesar.

### Reconstrucción del artefacto WASM

AssemblyScript está compilado por Vite; no se requiere Docker ni una cadena de herramientas nativa.

```bash
# Full build:
pnpm --filter @mission-platform/phone-number build

# Or just run Vite (recompiles AssemblyScript, regenerates src/generated):
pnpm --filter @mission-platform/phone-number exec vite build
```

## Uso

```ts
import { getPhoneNumberUtil, PhoneNumberFormat, PhoneNumberType } from '@mission-platform/phone-number';

const util = await getPhoneNumberUtil();

// Validation
util.isValidNumber('+14155552671', 'US'); // true
util.isPossibleNumber('12345', 'US'); // false

// Classification
util.getNumberType('07911 123456', 'GB'); // PhoneNumberType.MOBILE
util.getNumberType('+14155552671', 'US'); // PhoneNumberType.FIXED_LINE_OR_MOBILE

// Region lookup
util.getRegionCodeForNumber('+44 20 7946 0958', 'US'); // 'GB'
util.getCountryCodeForRegion('FR'); // 33

// Formatting
util.format('4155552671', 'US', PhoneNumberFormat.NATIONAL); // '(415) 555-2671'
util.format('4155552671', 'US', PhoneNumberFormat.E164); // '+14155552671'
util.format('07911 123456', 'GB', PhoneNumberFormat.INTERNATIONAL); // '+44 7911 123456'
util.format('4155552671', 'US', PhoneNumberFormat.RFC3966); // 'tel:+14155552671'
```

El argumento `defaultRegion` (ISO 3166-1 alfa-2) se consulta solo cuando la entrada **no** ya está en formato internacional.
formulario (`+…`, `00…` o NANP `011…`
Prefijo IDD).

## Posibilidad versus validez

- **`isPossibleNumber`** comprueba únicamente que el número significativo nacional tenga una longitud plausible para la región.
- **`isValidNumber`** requiere adicionalmente que el número esté dentro de un rango de línea fija o móvil asignado (equivalente
  a `getNumberType(...) !== UNKNOWN`).

```ts
util.isPossibleNumber('05001234567', 'GB'); // true  (right length)
util.isValidNumber('05001234567', 'GB'); //    false (unassigned range)
```

## Regiones y alcance admitidos

libphonenumber ascendente envía metadatos exhaustivos generados por máquinas para cada región de la UIT. Este puerto codifica un curado,
subconjunto verificado manualmente (**US, CA, GB, FR, DE, AU, IN, JP, BR, CN, RU**) e implementa la validación sin regularidad.
expresiones (no disponibles en AssemblyScript), utilizando reglas de longitud y dígitos iniciales. Usos de formato por región
agrupación de dígitos y es una aproximación plausible en lugar de una paridad byte por byte con el flujo ascendente. Se pueden agregar nuevas regiones
ampliando `assembly/metadata.ts` y reconstruyendo el wasm.
