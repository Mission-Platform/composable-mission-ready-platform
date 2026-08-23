# @mission-platform/forge-spa

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> workers/forge-spa/docs/index.md: [workers/forge-spa/docs/index.md](../../index.md)
> Idioma: Español (es)

El punto de entrada compartido de Cloudflare Worker para Mission Platform SPA y SSG
implementaciones. Delega solicitudes al enlace `ASSETS` y es consumido por
aplicaciones en lugar de implementarlas de forma independiente.

## Integrar al trabajador

Compile el paquete, luego haga referencia a su controlador compilado desde la aplicación consumidora.
Configuración Wrangler:

```bash
pnpm --filter @mission-platform/forge-spa build
```

La configuración del consumidor debe establecer `main` en
`workers/forge-spa/dist/index.js` y vincule el directorio de su aplicación `dist/` como
`ASSETS` con manejo de reserva de SPA. El sitio web y Mis notas de atención están actualizados
consumidores.

El trabajador no posee rutas de aplicación, activos, dominios o entorno.
secretos. Estos permanecen en el paquete de aplicaciones de consumo.

- [guía de desarrollo](guides/development.md)
- [`README.md`](../../../README.md)
