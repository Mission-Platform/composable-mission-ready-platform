# Directorio de despliegue de trabajadores

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> docs/configs/workers-config.md: [docs/configs/workers-config.md](../../../configs/workers-config.md)
> Idioma: Español (es)

La documentación de implementación del trabajador pertenece al lado de cada trabajador publicable:

- [`@mission-platform/api-proxy`](../../../../packages/edge/workers/api-proxy/docs/locales/es/index.md): proxy API de solo lectura restringido.
- [`@mission-platform/email-sender`](../../../../packages/edge/workers/email-sender/docs/locales/es/index.md): remitente local respaldado por MailPit.
- [`@mission-platform/forge-spa`](../../../../packages/edge/workers/forge-spa/docs/locales/es/index.md): controlador de reserva de SPA `ASSETS` compartido.

Esta página del proyecto mantiene solo el mapa de implementación entre espacios de trabajo. trabajador
los paquetes poseen sus contratos de controlador, ejemplos, pruebas e instrucciones de compilación;
paquetes de aplicaciones con rutas, dominios, enlaces e implementación propios
ambientes.

## Mapa de implementación de aplicaciones

| Solicitud | Manejador | Configuración | Activos |
| :-------------- | :---------------------------------------------- | :------------------------------------ | :------------------------------------------------ |
| Sitio web | `packages/edge/workers/forge-spa/dist/index.js` | `apps/website/wrangler.jsonc` | `apps/website/dist/`, encuadernado como `ASSETS` |
| Mis notas de cuidado | `packages/edge/workers/forge-spa/dist/index.js` | `apps/my-care-notes/wrangler.jsonc` | `apps/my-care-notes/dist/`, encuadernado como `ASSETS` |
| Monitor de servicio | `apps/service-monitor/src/worker.tsx` | `apps/service-monitor/wrangler.jsonc` | `apps/service-monitor/public/`, encuadernado como `ASSETS` |
| Documentos | Activos estáticos | `apps/docs/wrangler.jsonc` | `apps/docs/dist/` |

El sitio web y Mis notas de atención consumen el trabajador compartido de Forge SPA. Monitor de servicio
posee su punto de entrada de trabajador y su enlace de objeto duradero. El sitio de documentos es un
implementación estática Vite y no tiene ningún punto de entrada de trabajador; El libro de cuentos no es un
objetivo de implementación.

Implementar desde el paquete de aplicación cuya configuración Wrangler posee el
ruta y entorno. Mantenga los secretos fuera de la configuración y el uso rastreados
Almacenamiento secreto de Cloudflare para valores confidenciales. Ver la aplicación específica
scripts de implementación y guías de trabajadores locales del paquete para la implementación
detalles.
