# Directorio de despliegue de trabajadores

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> docs/configs/workers-config.md: [docs/configs/workers-config.md](../../../configs/workers-config.md)
> Idioma: Español (es)

La documentación de implementación del trabajador pertenece al lado de cada trabajador publicable:

- [`@mission-platform/api-proxy`](../../../../workers/api-proxy/docs/locales/es/index.md) - proxy API de solo lectura restringido.
- [`@mission-platform/email-sender`](../../../../workers/email-sender/docs/locales/es/index.md) - Remitente local respaldado por MailPit.
- [`@mission-platform/forge-spa`](../../../../workers/forge-spa/docs/locales/es/index.md) - compartido `ASSETS` Controlador de respaldo de SPA.

Esta página del proyecto mantiene solo el mapa de implementación entre espacios de trabajo. trabajador
los paquetes poseen sus contratos de manejo, ejemplos, pruebas e instrucciones de construcción;
paquetes de aplicaciones con rutas, dominios, enlaces e implementación propios
ambientes.

## Mapa de implementación de aplicaciones

| Solicitud | Manejador | Configuración | Activos |
| :---------- | :------ | :------------ | :----- |
| Sitio web | `workers/forge-spa/dist/index.js` | `apps/website/wrangler.jsonc` | `apps/website/dist/`, obligado como `ASSETS` |
| Mis notas de cuidado | `workers/forge-spa/dist/index.js` | `apps/my-care-notes/wrangler.jsonc` | `apps/my-care-notes/dist/`, obligado como `ASSETS` |
| Monitor de servicio | `apps/service-monitor/src/worker.tsx` | `apps/service-monitor/wrangler.jsonc` | `apps/service-monitor/public/`, obligado como `ASSETS` |
| Documentos | Activos estáticos | `apps/docs/wrangler.jsonc` | `apps/docs/dist/` |

El sitio web y Mis notas de atención consumen el trabajador compartido de Forge SPA. Monitor de servicio
posee su punto de entrada de trabajador y su enlace de objeto duradero. El sitio de documentos es un
estático Vite implementación y no tiene punto de entrada de trabajador; El libro de cuentos no es un
objetivo de implementación.

Implementar desde el paquete de aplicación cuyo Wrangler la configuración es propietaria de
ruta y entorno. Mantenga los secretos fuera de la configuración y el uso rastreados
Almacenamiento secreto de Cloudflare para valores confidenciales. Ver la aplicación específica
scripts de implementación y guías de trabajadores locales del paquete para la implementación
detalles.
