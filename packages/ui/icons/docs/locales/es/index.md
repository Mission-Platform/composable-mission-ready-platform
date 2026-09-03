# @mission-platform/icons

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/ui/icons/docs/index.md: [packages/ui/icons/docs/index.md](../../index.md)
> Idioma: Español (es)

`@mission-platform/icons` es una colección de componentes de iconos SVG de marco neutro para Mission Platform. Cada icono es
creado una vez y compilado en Vue 3 nativo, React, Solid, Svelte y compilaciones de componentes web en el momento de la compilación.

## Arquitectura y Distribución

El paquete aprovecha `@mission-platform/vite-plugin-forge` para proporcionar íconos de alto rendimiento que se pueden agitar en árbol para todos
marcos soportados:

- **Compilación**: un único `pnpm build` emite un paquete nativo del marco por objetivo, un `dist/icons.svg` determinista
  sprite y activos CSS por icono.
- **Entrada Única, Resolución Condicional**: Hay exactamente un punto de entrada público,
  `@mission-platform/icons`. Lleva `mp:vue`, `mp:react`, `mp:solid` y
  `mp:web-component` condiciones de exportación; cualquiera que active su cadena de herramientas decide qué compilación compilada es la básica
  El especificador resuelve. Sin ninguna condición establecida, vuelve a la fuente neutral de la forja, que es lo que otros
  Los componentes de "escritura única" consumen.

## Uso

### Elegir un marco

Seleccione el marco **una vez**, no por importación, desde Vite hasta `resolve.conditions` (use
`defineFrameworkAppConfig` o `frameworkResolveConditions` de `@mission-platform/vite-config`) y en TypeScript
a través de `customConditions` (ampliar un `@mission-platform/typescript-config/framework-<name>`
preestablecido):

```ts
resolve: {
  conditions: frameworkResolveConditions('mp:vue'),
}
```

### Importaciones

Entonces, cada importación es simple e idéntica en todos los marcos:

**Vue 3** (`mp:vue` activo):

```vue
import { ForgeIconAlert, ForgeIconArrow } from '@mission-platform/icons';
```

**React** (`mp:react` activo):

```tsx
import { ForgeIconAlert, ForgeIconArrow } from '@mission-platform/icons';
```

### Importaciones de componentes neutros

Al crear un componente neutral del marco (compilado por `vite-plugin-forge`), no hay ninguna condición `mp:*` activa y el
El mismo especificador te da la fuente neutral:

```tsx
import { ForgeIconAlert, ForgeIconArrow } from '@mission-platform/icons';
```

## Taxonomía y catálogo

Las carpetas de creación y los títulos de Storybook siguen `icons/<category>/<subcategory>/<icon-name>`. El catálogo revisado cubre
`navigation`, `text`, `maps`, `routing`, `drawing`, `content`, `status`, `communication`, `media`, `security`, `data`,
`time` y `objects`. La revisión de brechas se registra en `src/catalog.ts`; mantiene el apoyo a los países basado en datos y registros
ilustraciones diferidas de aplicaciones específicas en lugar de crear un componente por país.

## Reutilización de sprites

Cada contenedor genera un `<svg>` externo accesible con una referencia `<use href="#icon-id">`. `IconSpriteProvider` soportes
los símbolos canónicos una vez para un subárbol en línea:

```tsx
import { ForgeIconAlert, ForgeIconArrow, IconSpriteProvider } from '@mission-platform/icons';

export function Toolbar() {
  return (
    <IconSpriteProvider>
      <ForgeIconAlert ariaLabel="Alert" />
      <ForgeIconArrow
        direction="right"
        ariaLabel="Next"
      />
    </IconSpriteProvider>
  );
}
```

Para un activo externo que se puede almacenar en caché, utilice `src="/assets/icons.svg"` con `inline={false}`. Referencias de fragmentos SVG externos
requerir acceso del mismo origen o una política CORS compatible; El modo en línea es la alternativa para SSR, CSP restrictivo o navegadores.
que no puede resolver fragmentos externos. La compilación del paquete emite `dist/icons.svg`, también disponible como
`@mission-platform/icons/icons.svg`.

## API de país y composición

`ForgeIconFlag` y `ForgeIconCountryGlobe` aceptan códigos de estilo ISO en mayúsculas de `SUPPORTED_COUNTRY_CODES`, incluidos
`US`, `CA`, `JP`, `GB` y `ZA`. Los valores de tiempo de ejecución no admitidos arrojan un error descriptivo. Globos terráqueos, ruta/waypoint
Los patrones y superposiciones futuras son composiciones de símbolos escritos: hacen referencia a ID existentes con transformaciones y se verifican.
para referencias y ciclos faltantes antes de la generación de sprites.

## Referencia de API

Cada icono representa un `<svg role="img">` dentro de un contenedor `<div>` centrado que utiliza la clase BEM `.forge-icon-<name>`.
Todos los iconos se basan en un cuadro de visualización de $24 \times 24$.

### Accesorios universales

| Apoyo       | Tipo               | Predeterminado             | Descripción                                                                                                             |
| :---------- | :----------------- | :------------------------- | :---------------------------------------------------------------------------------------------------------------------- |
| `size`      | `number \| string` | `'md'`                     | Ancho y alto. Admite tokens con nombre (`'2xs'`, `'xs'`, `'sm'`, `'md'`, `'lg'`, `'xl'`, `'2xl'`) o un número de píxel. |
| `color`     | `string`           | `'currentColor'`           | Color de trazo (y relleno para iconos de marcadores rellenos).                                                          |
| `ariaLabel` | `string`           | _Predeterminado por icono_ | Nombre accesible. Si se omite, el icono se marca como `aria-hidden`.                                                    |

### Iconos de comportamiento

Ciertos íconos incluyen accesorios adicionales para controlar su apariencia:

| Icono              | Accesorios adicionales                                                       | Descripción                                                             |
| :----------------- | :--------------------------------------------------------------------------- | :---------------------------------------------------------------------- |
| `ForgeIconArrow`   | `direction`: `'up' \| 'right' \| 'down' \| 'left'` (`'up'` predeterminado)   | Gira la flecha mediante una transformación en línea.                    |
| `ForgeIconChevron` | `direction`: `'up' \| 'right' \| 'down' \| 'left'` (`'down'` predeterminado) | Gira el galón mediante una transformación en línea.                     |
| `ForgeIconSort`    | `active`: `boolean`, `direction`: `'asc' \| 'desc' \| undefined`             | Resalta el galón que coincide con la dirección de clasificación activa. |

## Biblioteca de iconos

La biblioteca incluye una amplia gama de iconos que cubren varias categorías:

- **Estado y estado**: `ForgeIconAlert`, `ForgeIconCheck`, `ForgeIconError`, `ForgeIconInfo`, `ForgeIconWarning`.
- **Navegación**: `ForgeIconArrow`, `ForgeIconChevron`, `ForgeIconHome`, `ForgeIconMenu`, `ForgeIconExternalLink`.
- **Medios**: `ForgeIconCamera`, `ForgeIconImage`, `ForgeIconMail`, `ForgeIconPhone`.
- **Controles de interfaz de usuario**: `ForgeIconClose`, `ForgeIconEdit`, `ForgeIconPlus`, `ForgeIconMinus`, `ForgeIconSearch`,
  `ForgeIconSettings`.
- **Formato de contenido**: `ForgeIconBold`, `ForgeIconItalic`, `ForgeIconBulletList`, `ForgeIconNumberedList`,
  `ForgeIconHeadingOne`...
  `ForgeIconHeadingSix`.
- **Herramientas especializadas**: `ForgeIconWrench`, `ForgeIconPalette`, `ForgeIconDebug`, `ForgeIconQrCode`.

## Desarrollo y mantenimiento

### Iconos de construcción

La compilación propiedad del paquete emite declaraciones neutrales, todos los adaptadores de marco y el objeto SVG. Después de cambiar de catálogo o
fuente del sprite, ejecuta:

```sh
pnpm exec turbo run build:check --filter @mission-platform/icons
pnpm exec turbo run build --filter @mission-platform/icons
```

### libro de cuentos

Los iconos están catalogados en `icons/<category>/<subcategory>/<icon-name>`, mientras que `icons/overview` sigue siendo la galería completa.
La descripción general también muestra íconos repetidos a través de un `IconSpriteProvider`; historias individuales exponen `size`,
Controles `color`, código de país y `ariaLabel` cuando corresponda.
