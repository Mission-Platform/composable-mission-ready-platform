# Desarrollar el trabajador Forge SPA

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> workers/forge-spa/docs/guides/development.md: [workers/forge-spa/docs/guides/development.md](../../../guides/development.md)
> Idioma: Español (es)

Ejecute las comprobaciones del paquete desde la raíz del repositorio:

```bash
pnpm --filter @mission-platform/forge-spa build:check
pnpm --filter @mission-platform/forge-spa test
pnpm --filter @mission-platform/forge-spa build
```

La compilación emite `dist/index.js` y declaraciones. Mantenga al manejador limitado a
la delegación `ASSETS.fetch(request)` escrita y el reenvío de solicitud de prueba. prueba
e implementar rutas de aplicaciones desde la aplicación consumidora; no agregar aplicación
configuración o activos a este trabajador compartido.
