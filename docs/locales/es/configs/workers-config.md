# Configuración y desarrollo de trabajadores

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> Fuente en inglés: [docs/configs/workers-config.md](../../../configs/workers-config.md)
> Idioma: Español (es)

Este documento describe a los trabajadores de Cloudflare en el monorepo Mission Platform, sus TypeScript puntos de entrada y el
archivos de configuración utilizados para ejecutarlos o implementarlos.

## Inventario de trabajadores

Los paquetes de trabajadores independientes viven bajo `workers/`:

| Trabajador | Manejador | Configuración | Propósito |
| :----- | :------ | :------------ | :------ |
| `api-proxy` | `workers/api-proxy/src/index.ts` | Ninguno; consumido como un paquete | Proxy API de solo lectura restringido |
| `email-sender` | `workers/email-sender/src/index.ts` | `workers/email-sender/wrangler.jsonc` | Trabajador de escaparate de correo electrónico respaldado por MailPit |
| `forge-spa` | `workers/forge-spa/src/index.ts` | Ninguno; consumido como un paquete | `ASSETS`controlador de respaldo SPA vinculante |

Los trabajadores de la aplicación desplegable son:

| Solicitud | Manejador | Configuración |
| :---------- | :------ | :------------ |
| Sitio web | `workers/forge-spa/dist/index.js` | `apps/website/wrangler.jsonc` |
| Mis notas de cuidado | `workers/forge-spa/dist/index.js` | `apps/my-care-notes/wrangler.jsonc` |
| Monitor de servicio | `apps/service-monitor/src/worker.tsx` | `apps/service-monitor/wrangler.jsonc` |

`api-proxy` y `forge-spa` no tener independiente Wrangler archivos de configuración: sus `src/index.ts` los manejadores son
empaquetado por `tsdown` y referenciado por la aplicación Wrangler configuraciones o una implementación que consume mucho tiempo.

## Sistema de construcción

Uso de paquetes de trabajadores `tsdown` para agrupar. Utilice la tarea del paquete a través de Turborepo o pnpm entonces las dependencias del espacio de trabajo son
resuelto consistentemente:

```bash
pnpm exec turbo run build --filter=@mission-platform/api-proxy
pnpm exec turbo run build --filter=@mission-platform/forge-spa
pnpm exec turbo run build --filter=@mission-platform/email-sender
```

Uso de pruebas de trabajadores Vitest:

```bash
pnpm --filter @mission-platform/api-proxy test
pnpm --filter @mission-platform/email-sender test
pnpm --filter @mission-platform/forge-spa test
```

Usar `@cloudflare/workers-types` para tipos de manipulador y de encuadernación. Las declaraciones vinculantes generadas por el remitente del correo electrónico son
escrito a `workers/email-sender/src/worker-configuration.d.ts` por su `types` guion.

## Configuración y Desarrollo Local

Los trabajadores reciben valores de tiempo de ejecución a través del `env` enlaces de objetos y Cloudflare. No pongas secretos en seguimiento.
`wrangler.jsonc` archivos; usar `wrangler secret put` para valores sensibles.

Para el remitente de correo electrónico independiente, ejecute su configuración Wrangler servidor de desarrollo del paquete de espacio de trabajo:

```bash
pnpm --filter @mission-platform/email-sender dev
```

Para aplicaciones implementables, utilice los scripts de cada paquete de aplicación. Por ejemplo, el sitio web y Mis notas de atención Wrangler
los archivos proporcionan `staging` y `production` entornos, mientras que Service Monitor proporciona una `staging` ambiente:

```bash
pnpm --filter @mission-platform/website cf:dev
pnpm --filter @mission-platform/my-care-notes cf:dev
pnpm --filter @mission-platform/service-monitor dev
```

## Despliegue

Implementar desde el paquete de aplicación cuyo `wrangler.jsonc` es propietario de la ruta y el entorno:

```bash
pnpm --filter @mission-platform/website deploy:staging
pnpm --filter @mission-platform/my-care-notes deploy:staging
pnpm --filter @mission-platform/service-monitor deploy:staging
```

Los paquetes de trabajadores independientes sin Wrangler La configuración no se implementa directamente con `wrangler deploy`; construir
sus controladores e implementarlos a través de la configuración de la aplicación consumidora.

## Mejores prácticas

- Agrupe las dependencias en la salida del trabajador para una ejecución perimetral predecible.
- Utilice el `env` objeto pasado al `fetch` controlador en lugar de variables de proceso globales.
- Evitar NodeIncorporaciones .js no compatibles con el tiempo de ejecución de Workers, como `fs` y `child_process`, en manipuladores de trabajadores.
- Mantenga pequeños los paquetes de trabajadores para minimizar los arranques en frío y mantenerse dentro de los límites de recursos de Cloudflare.
