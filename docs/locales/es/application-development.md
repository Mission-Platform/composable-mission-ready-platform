# Desarrollo de aplicaciones

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> Fuente en inglés: [docs/application-development.md](../../application-development.md)
> Idioma: Español (es)

Esta guía práctica explica cómo ejecutar, probar e implementar las aplicaciones en `apps/`. Las aplicaciones se componen de reutilizables.
paquetes; Los componentes compartidos, los elementos componibles, las utilidades y la configuración pertenecen a su propio espacio de trabajo en lugar de estar
copiado en una aplicación.

## Elige una aplicación

| Solicitud | Desarrollo local | Construir | Implementación |
|:---|:---|:---|:---|
| `@mission-platform/docs` | `pnpm --filter @mission-platform/docs dev` | `pnpm --filter @mission-platform/docs build` | Vista previa o implementación a través de su trabajador de hosting |
| `@mission-platform/website` | `pnpm --filter @mission-platform/website dev` | `pnpm --filter @mission-platform/website build` | `pnpm --filter @mission-platform/website deploy:staging` |
| `@mission-platform/my-care-notes` | `pnpm --filter @mission-platform/my-care-notes dev` | `pnpm --filter @mission-platform/my-care-notes build` | `pnpm --filter @mission-platform/my-care-notes deploy:staging` |
| `@mission-platform/service-monitor` | `pnpm --filter @mission-platform/service-monitor dev` | `pnpm --filter @mission-platform/service-monitor build` | `pnpm --filter @mission-platform/service-monitor deploy:staging` |
| `@mission-platform/storybook` | `pnpm --filter @mission-platform/storybook dev` | `pnpm --filter @mission-platform/storybook build` | Utilice el flujo de trabajo Storybook/Chromatic configurado |

El paquete de aplicación posee su Vite o Wrangler configuración. no corras `wrangler deploy` de un trabajador reutilizable
paquete a menos que ese paquete tenga su propio `wrangler.jsonc`.

## Desarrollar un cambio

1. Inicie la aplicación de destino con su paquete. `dev` guion.
2. Realice cambios reutilizables en `packages/` y cambios de composición específicos de la aplicación en `apps/<name>/`.
3. Cree la aplicación modificada y sus dependencias:

```bash
   pnpm exec turbo run build --filter @mission-platform/<app>...
   ```

4. Ejecute pruebas, pelusa, comprobaciones de estilo y formato para el espacio de trabajo afectado:

```bash
   pnpm exec turbo run test lint lint:style format --filter @mission-platform/<app>
   ```

Para un cambio de paquete compartido, reemplace `<app>` con el nombre del paquete y el uso `...` cuando necesitas espacios de trabajo dependientes
incluido en el gráfico de construcción.

## Documentación estática y creación de sitios web.

Los documentos y las aplicaciones del sitio web utilizan `vite-ssg`. Una compilación de producción genera rutas estáticas a partir del contenido fuente y
catálogos locales. Verifique la salida generada con el paquete `preview` guion:

```bash
pnpm --filter @mission-platform/docs build
pnpm --filter @mission-platform/docs preview

pnpm --filter @mission-platform/website build
pnpm --filter @mission-platform/website preview
```

Mantenga la documentación Markdown en `docs/` y mensajes del sitio web en el catálogo local propietario. No agregues ni un segundo
copia en tiempo de renderizado de cualquiera de las fuentes.

## Desarrollo e implementación de Cloudflare

Aplicaciones con un `wrangler.jsonc` exponer comandos conscientes del entorno:

```bash
pnpm --filter @mission-platform/website cf:dev
pnpm --filter @mission-platform/my-care-notes cf:dev
pnpm --filter @mission-platform/service-monitor dev

pnpm --filter @mission-platform/website deploy:staging
pnpm --filter @mission-platform/my-care-notes deploy:staging
pnpm --filter @mission-platform/service-monitor deploy:staging
```

Usar `wrangler secret put` por secretos. Mantener enlaces y valores predeterminados no secretos en `wrangler.jsonc`y verificar el
entorno seleccionado antes de la implementación.

## Guías relacionadas

- [Configuración de desarrollo](development-setup.md)
- [Estructura del espacio de trabajo](workspace-structure.md)
- [Sistema de construcción](build-system.md)
- [Configuración del trabajador](configs/workers-config.md)
- [Pruebas](testing.md)
