# @mission-platform/forge-router-web-components

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/compiler/plugins/forge-router-web-components/docs/index.md: [packages/compiler/plugins/forge-router-web-components/docs/index.md](../../index.md)
> Idioma: Español (es)

Objetivo de enrutador Forge para componentes web sin marco.

## Carga de ruta asíncrona

Utilice `loadingFallback` para mostrar una rueda giratoria mientras se resuelve una vista de ruta asíncrona.
`forge-router-outlet` representa el respaldo como una superposición y mantiene el actual
vista montada hasta que el destino esté listo:

```ts
import {
  MpMemoryHistory,
  createWebComponentsRouter,
  registerRouterElements,
  setForgeRouter,
} from '@mission-platform/forge-router-web-components/runtime';

registerRouterElements();

const router = createWebComponentsRouter({
  history: new MpMemoryHistory('/docs/intro'),
  loadingFallback: () => {
    const spinner = document.createElement('span');
    spinner.className = 'docs-loading-spinner';
    spinner.setAttribute('aria-label', 'Loading documentation');
    return spinner;
  },
  routes: [
    {
      path: '/docs/*',
      name: 'doc',
      component: async () => (await import('./views/docs-view')).default(),
    },
  ],
});

setForgeRouter(router);
document.querySelector('forge-router-outlet')?.setRouter(router);
```

```html
<forge-router-link to="/docs/advanced">Advanced documentation</forge-router-link>
<forge-router-outlet></forge-router-outlet>
```

El medio elimina la superposición después del éxito, redireccionamiento, cancelación o
fracaso. Las promesas de vista de ruta se comparten entre la navegación y el montaje de salida,
por lo que una fábrica perezosa no se invoca dos veces. Un resultado tardío de algo obsoleto
La navegación no puede reemplazar una vista más nueva.

`forge-router-link` es el punto de entrada del SPA con ámbito. Actualiza el historial a través
`push` de forma predeterminada o `replace` cuando se establece la propiedad/atributo `replace`,
actualiza su estado `active` y `exact-active`, y deja clics modificados,
clics no principales, descargas, URL externas y enlaces dirigidos al sitio nativo
navegador.

## Marco neutral `Suspense`

La fuente compartida de Forge puede usar el límite neutral y permitir que cada compilador lo reduzca
a la implementación nativa de destino:

```tsx
<Suspense fallback={<LoadingSpinner label="Loading documentation" />}>
  <DocumentationRoute />
</Suspense>
```

Para componentes web, utilice el contrato `loadingFallback` de la salida del enrutador para
transiciones de ruta; no se requiere tiempo de ejecución de marco ni intercepción de anclaje global
requerido.
