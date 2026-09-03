# Desarrollar script web de Forge

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/compiler/forge/forge-web-script/docs/guides/development.md: [packages/compiler/forge/forge-web-script/docs/guides/development.md](../../../guides/development.md)
> Idioma: Español (es)

Esta guía está dirigida a los contribuyentes que cambian el analizador de Forge Web Script, marcado
contratos o acuerdos de conformidad.

## Instalar y comprobar el paquete.

Desde la raíz del repositorio, instale las dependencias y ejecute las comprobaciones de paquetes:

```bash
pnpm install
pnpm --filter @mission-platform/forge-web-script build:check
pnpm --filter @mission-platform/forge-web-script test
```

Ejecute `pnpm --filter @mission-platform/forge-web-script build` antes de publicar.
La compilación emite el paquete seguro para el navegador y los archivos de declaración en `dist/`.

## Agregar un cambio de idioma

Actualice la gramática y la interfaz marcada juntas. Añade un dispositivo enfocado a
`src/fixtures/` y una prueba de regresión para diagnóstico o comportamiento generado.
Mantenga explícita la versión de idioma `1.0` y la versión ABI `1.2` a menos que el cambio sea
una revisión de compatibilidad intencional. Los cambios de ABI deben actualizar los manifiestos,
cargadores y la documentación de compatibilidad.

El paquete es seguro para el navegador. No agregue API exclusivas de Node a la fachada pública;
Las herramientas específicas de Node pertenecen a `@mission-platform/forge-web-script-cli`.

## Artefactos generados y fuente

Las fuentes `.fws` registradas en `src/self-hosted/fws/` son artefactos fuente,
JavaScript no copiado a mano. Mantenga la salida generada en `dist/` y no confirme
producción de compilación local. La referencia de la documentación del paquete se mantiene al lado
el paquete y será regenerado por el flujo de trabajo de extracción de documentación.
