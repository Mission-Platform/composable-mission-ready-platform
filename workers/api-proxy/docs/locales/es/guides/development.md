# Desarrollar el trabajador proxy API

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> workers/api-proxy/docs/guides/development.md: [workers/api-proxy/docs/guides/development.md](../../../guides/development.md)
> Idioma: Español (es)

Ejecute las comprobaciones enfocadas desde la raíz del repositorio:

```bash
pnpm --filter @mission-platform/api-proxy build:check
pnpm --filter @mission-platform/api-proxy test
pnpm --filter @mission-platform/api-proxy build
```

La compilación emite `dist/index.js` y declaraciones. Mantenga el controlador compatible
con el tiempo de ejecución de Cloudflare Workers: utilice el objeto `env` escrito para los enlaces
y no agregue elementos integrados Node.js. Agregar pruebas para listas de rutas permitidas, desinfectadas
encabezados, reenvío de consultas y fallas ascendentes al cambiar el controlador.
