# Desarrollar el complemento Forge Vite

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> vite-plugins/forge/docs/guides/development.md: [vite-plugins/forge/docs/guides/development.md](../../../guides/development.md)
> Idioma: Español (es)

## Instalar y verificar

Ejecute comprobaciones enfocadas desde la raíz del repositorio:

```bash
pnpm install
pnpm --filter @mission-platform/vite-plugin-forge build:check
pnpm --filter @mission-platform/vite-plugin-forge test
```

Construya con `pnpm --filter @mission-platform/vite-plugin-forge build`. Paquetes
y las declaraciones se emiten a `dist/`; no confirme la salida de compilación local.

## Cambiar el compilador

Mantenga neutrales el análisis, la normalización, la IR semántica, el almacenamiento en caché y el diagnóstico.
La reducción del objetivo y la generación de la fuente pertenecen al grupo seleccionado.
Paquete `@mission-platform/forge-plugin-*`. Agregar cobertura de regresión para caché
identidad, invalidación, diagnóstico, artefactos generados y complemento de llamada
preservación al cambiar el controlador.

El paquete debe seguir siendo utilizable tanto desde Vite como desde tsdown. No agregar un objetivo
cambie la dependencia del tiempo de ejecución de la tabla o del marco al controlador neutral. Actualizar el
[referencia de canalización del compilador](../reference/compiler.md) cuando un escenario público o
cambios en el contrato de artefactos.
