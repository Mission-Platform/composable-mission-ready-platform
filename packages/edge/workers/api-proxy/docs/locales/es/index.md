# @mission-platform/api-proxy

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/edge/workers/api-proxy/docs/index.md: [packages/edge/workers/api-proxy/docs/index.md](../../index.md)
> Idioma: Español (es)

Un ejemplo de Cloudflare Worker que representa rutas API de solo lectura aprobadas a un
servicio fijo aguas arriba. Este espacio de trabajo es propietario de la política de solicitud, encabezado
desinfección y límite de error para el controlador de proxy.

## utilizar el trabajador

El paquete exporta su controlador incluido desde `@mission-platform/api-proxy`.
Compílelo antes de hacer referencia a `dist/index.js` desde una configuración Wrangler:

```bash
pnpm --filter @mission-platform/api-proxy build
```

Sólo se aceptan solicitudes `GET` y `HEAD` a `/users` y `/v1`. Consulta
las cadenas se reenvían; credenciales, el `Host` original y salto a salto
Se eliminan los encabezados. Los errores de construcción de solicitudes o en sentido ascendente devuelven `502`.

## Limitaciones

El paquete no tiene ninguna configuración de implementación Wrangler registrada y no es un
Proxy inverso de propósito general. Agregue una configuración de implementación explícita y
revise los cambios de autenticación, flujo ascendente y almacenamiento en caché antes de exponerlos.

- [guía de desarrollo](guides/development.md)
- [`README.md`](../../../README.md)
