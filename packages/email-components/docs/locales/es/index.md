# @mission-platform/email-components

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/email-components/docs/index.md: [packages/email-components/docs/index.md](../../index.md)
> Idioma: Español (es)

`@mission-platform/email-components` contiene componentes Forge JSX tipificados y de marco neutral para generar árboles seguros para el correo electrónico. Utilice `@mission-platform/email-renderer` para serializar esos árboles en el servidor; La ruta de correo electrónico no requiere Vue, React, Svelte, Solid, tiempo de ejecución de componentes web, DOM del navegador o JavaScript.

## Uso

```ts
import { EmailButton, EmailContainer, EmailDocument, EmailTypography } from '@mission-platform/email-components';
import { renderEmail } from '@mission-platform/email-renderer';

const email = EmailDocument({
  previewText: 'A short inbox preview',
  children: EmailContainer({
    children: EmailTypography({ children: 'Hello from Mission Platform.' }),
  }),
});

const html = renderEmail(email, { title: 'Welcome', responsive: true });
```

## Vistas previas del navegador

Los componentes devuelven el mismo árbol Forge neutral en el marco utilizado por el
canalización estándar del navegador. Para obtener una vista previa, pase ese árbol al opcional
Punto de entrada del adaptador requerido por el marco del host:

```ts
import { renderToEmailVue } from '@mission-platform/email-renderer/vue';

const previewNode = renderToEmailVue(email);
```

React, Svelte, Solid y los componentes web utilizan su correspondiente renderizador
subruta, o los cinco se pueden importar desde
`@mission-platform/email-renderer/adapters`. La ruta de vista previa del navegador y
La ruta del servidor `renderEmail` consume el mismo árbol de componentes; solo este ultimo
agrega el contenedor completo del documento de correo electrónico.

## Componentes

- Átomos: `EmailTypography`, `EmailButton`, `EmailImage`, `EmailDivider`, `EmailSpacer`.
- Moléculas: `EmailRow`, `EmailColumn`, `EmailCard`, `EmailList`, `EmailSocialLinks`.
- Organismos: `EmailPreheader`, `EmailHeader`, `EmailFooter`.
- Plantillas: `EmailDocument`, `EmailContainer`, `EmailSection`.

`EmailTypography` es el átomo de texto único, que refleja el vocabulario web `ForgeTypography`: `as` selecciona el elemento representado (`p` por defecto, `a` cuando `href` está configurado), `variant` selecciona la escala de tipo (la escala de encabezado coincidente cuando `as` está `h1`–`h6`, de lo contrario `body-md`), y `color`, `align`, `target` y `underline` ajustan las declaraciones en línea.

```ts
EmailTypography({ as: 'h1', children: 'Welcome' });
EmailTypography({ children: 'Body copy' });
EmailTypography({ href: 'https://example.com', target: '_blank', children: 'Read more' });
```

Todo el diseño se basa en `table`, `tbody`, `tr` y `td`. Los botones son enlaces normales dentro de las tablas, las imágenes requieren texto `alt` que no esté vacío, las URL se validan y los estilos se resuelven en declaraciones literales de `@mission-platform/tokens`.

## Política de compatibilidad

La línea de base sigue la [¿Puedo enviar por correo electrónico el catálogo de funciones?](https://www.caniemail.com/features), revisado en `2026-08-08`. La implementación depende de [tablas HTML](https://www.caniemail.com/features/html-tables), [estilos en línea](https://www.caniemail.com/features/css-inline-styles), [ancho máximo](https://www.caniemail.com/features/css-max-width), y opcional [consultas de medios](https://www.caniemail.com/features/css-at-media). La salida estática no depende de flexbox, grid, propiedades personalizadas de CSS, propiedades lógicas, scripts, controladores de eventos o marcadores de hidratación del marco.

El CSS responsivo es solo una mejora progresiva: el diseño de la tabla en línea sigue siendo utilizable cuando el bloque `<style>` se elimina o se ignora. Utilice `assertCompatibleEmailHtml` en pruebas de aplicaciones al agregar nodos personalizados.
