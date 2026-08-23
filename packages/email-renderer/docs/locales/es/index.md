# @mission-platform/email-renderer

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/email-renderer/docs/index.md: [packages/email-renderer/docs/index.md](../../index.md)
> Idioma: Español (es)

`@mission-platform/email-renderer` posee el límite de representación neutral del marco para los árboles de correo electrónico de Mission Platform. Su entrada raíz es segura para la generación de correo electrónico del lado del servidor; Los adaptadores de navegador están aislados detrás de subrutas explícitas.

## Representación del servidor y Markdown

```ts
import { renderEmail, renderMarkdown } from '@mission-platform/email-renderer';

const document = renderMarkdown('# Welcome\n\nRead **more** at [Mission Platform](https://example.com).');
const html = renderEmail(document.node, { title: 'Welcome', previewText: 'A short preview' });
```

Markdown se convierte en el árbol compartido de Forge, por lo que los enlaces, imágenes, texto y HTML se escapan o se validan antes de la serialización. La salida tiene un orden determinista de atributos/estilos y rechaza URL de script, atributos de eventos, variables CSS, valores flexibles/cuadrícula y marcadores de marco.

## Adaptadores de navegador

Utilice solo la subruta del adaptador requerida por una aplicación o vista previa del navegador:

- `@mission-platform/email-renderer/vue` → `renderToEmailVue`, `toEmailVueComponent`.
- `@mission-platform/email-renderer/react` → `renderToEmailReact`, `toEmailReactComponent`.
- `@mission-platform/email-renderer/svelte` → `renderToEmailSvelte` para Svelte 5 `{@render ...}`.
- `@mission-platform/email-renderer/solid` → `renderToEmailSolid`, `toEmailSolidComponent`.
- `@mission-platform/email-renderer/web-components` → `renderToEmailWebComponent`.

Para una única importación opcional que exponga los cinco adaptadores de navegador, utilice
`@mission-platform/email-renderer/adapters`. Esta entrada está separada de la
entrada raíz para que la generación de correo electrónico solo del servidor nunca cargue un tiempo de ejecución del marco.

Estos puntos de entrada opcionales reutilizan el mismo árbol de Forge. El serializador de correo electrónico raíz no los importa y no son necesarios en implementaciones de correo electrónico solo de servidor.
