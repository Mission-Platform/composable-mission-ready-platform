# @mission-platform/i18n

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/i18n/docs/index.md: [packages/i18n/docs/index.md](../../index.md)
> Idioma: Español (es)

`@mission-platform/i18n` es un contenedor de internacionalización independiente del marco (i18n) creado
en [i18siguiente](https://www.i18next.com/). Proporciona una forma unificada de manejar las traducciones en toda la Plataforma de la Misión,
con adaptadores dedicados tanto para Vue 3 como para React.

## Punto de entrada

El paquete tiene un único punto de entrada, `@mission-platform/i18n`. El adaptador al que se resuelve lo decide
la condición de exportación activa `mp:<framework>`, que selecciona **una vez** para todo el proyecto:
`resolve.conditions` en Vite (ver `defineFrameworkAppConfig` / `frameworkResolveConditions` de
`@mission-platform/vite-config`) y `customConditions` en TypeScript (a través del
`@mission-platform/typescript-config/framework-<name>` preajustes). Cada importación permanece vacía.

| Condición activa | Resuelve | Exportaciones clave |
| :--------------- | :--------------------- | :---------------------------------------------------------------------- |
| _(ninguno)_ | Núcleo neutral en cuanto al marco | `createForgeI18N`, `forgeNamespace`, `localeNamespaces`, `mergeLocales` |
| `mp:vue` | Vue 3 adaptadores | el núcleo neutro más `createForgeI18NVue`, `useI18n` |
| `mp:react` | Adaptador React | el núcleo neutro más `ForgeI18NProvider`, `useI18n` |

## Conceptos básicos

### La instancia i18n

El núcleo proporciona `createForgeI18N(options)`, que devuelve una instancia i18next inicializada sincrónicamente.

- **Interpolación**: utiliza delimitadores de una sola llave (por ejemplo, `{name}`).
- **Escapado HTML**: deshabilitado de forma predeterminada (`escapeValue: false`) para permitir que los marcos manejen el escape de acuerdo con
  sus propios modelos de seguridad.

### Estrategia de espacio de nombres

Para evitar colisiones en un monorepo, las traducciones se agrupan en espacios de nombres usando la convención `mp.<workspace>`:

- **Paquetes**: use `forgeNamespace('<package_name>')` (por ejemplo, `@mission-platform/breakpoints` usa `mp.breakpoints`).
- **Aplicaciones**: Utilice `forgeNamespace('<app_name>')`.

#### Jerarquía de espacios de nombres y anulaciones

1. **Espacio de nombres predeterminado**: las aplicaciones definen su propio espacio de nombres como predeterminado.
2. **Retroceso**: el espacio de nombres predeterminado recurre a otros espacios de nombres, lo que permite que el código del componente resuelva sus propias claves.
3. **Anulaciones**: las aplicaciones pueden proporcionar un objeto `overrides` en la configuración para volver a etiquetar cadenas específicas de un paquete.
   sin afectar a los demás.

## Ejemplos de uso

### 1. Configuración central

```ts
import { createForgeI18N, localeNamespaces, forgeNamespace } from '@mission-platform/i18n';

const i18n = createForgeI18N({
  namespace: forgeNamespace('my-care-notes'),
  namespaces: localeNamespaces('en', enBundles), // Turn YAML bundles into i18next shape
  overrides: {
    [forgeNamespace('breakpoints')]: {
      en: { breakpoint: 'Viewport:' },
    },
  },
});
```

### 2. Vue 3 Integración

**Instalación:**

```ts
// With the mp:vue condition active.
import { createForgeI18N, createForgeI18NVue } from '@mission-platform/i18n';

const i18n = createForgeI18N({ messages: { en: { hello: 'Hello {name}' } } });
app.use(createForgeI18NVue(i18n));
```

**Uso de componentes:**

```vue
<script setup lang="ts">
  import { useI18n } from '@mission-platform/i18n';
  const { t, locale, setLocale } = useI18n();
</script>

<template>
  <button>{{ t('hello', { name: 'World' }) }}</button>
</template>
```

### 3. Integración React

**Configuración del proveedor:**

```tsx
// With the mp:react condition active — same bare specifier as the Vue example.
import { createForgeI18N, ForgeI18NProvider, useI18n } from '@mission-platform/i18n';

const i18n = createForgeI18N({ messages: { en: { hello: 'Hello {name}' } } });

root.render(
  <ForgeI18NProvider i18n={i18n}>
    <App />
  </ForgeI18NProvider>,
);
```

**Uso de componentes:**

```tsx
function Greeting() {
  const { t } = useI18n();
  return <button>{t('hello', { name: 'World' })}</button>;
}
```

## Referencia de API

### `forgeNamespace(workspace: string)`

Devuelve la cadena de espacio de nombres estandarizado para un espacio de trabajo determinado (por ejemplo, `'breakpoints'` $\rightarrow$
`'mp.breakpoints'`).

### `localeNamespaces(locale: string, bundles: any)`

Transforma los archivos de traducción sin formato con clave de espacio de nombres (normalmente de YAML) al formato esperado por i18next.
