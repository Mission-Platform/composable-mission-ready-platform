# guía de desarrollo

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> docs/guides/development.md: [docs/guides/development.md](../../../guides/development.md)
> Idioma: Español (es)

## Ciclo de vida de construcción de Forge

Los paquetes Forge utilizan el mismo contrato de sesión diferida de Vite y tsdown. mantener
selección de objetivos explícita mediante la construcción de un marco propiedad de la persona que llama o una salida CMS
complementos, luego adjunte los complementos del adaptador a la configuración del paquete nativo.

```ts
import { tsdownForgeComponentPlugins } from "@mission-platform/vite-plugin-forge";
import { forgeVueFramework } from "@mission-platform/forge-plugin-vue";
import { defineTsdownLibrary } from "@mission-platform/tsdown-config";

export default defineTsdownLibrary({
  rootDir: import.meta.dirname,
  entry: "src/index.ts",
  plugins: tsdownForgeComponentPlugins({
    rootDir: import.meta.dirname,
    componentsModule: `${import.meta.dirname}/src/components/index.ts`,
    frameworks: [forgeVueFramework()],
    name: "Components",
  }),
});
```

La evaluación de la configuración es intencionalmente barata: descubrimiento de gráficos, fuente
La generación, la agrupación nativa, las declaraciones y la publicación comienzan desde el paquete.
ganchos del ciclo de vida. La sesión compartida reutiliza análisis neutrales en seleccionados
apunta e invalida los dependientes inversos cuando el modo de vigilancia informa un cambio.

Cada objetivo escribe en un directorio de intento aislado y se promueve solo después
se validan su manifiesto, declaraciones, mapas, activos y módulos generados. un
La compilación fallida, cancelada o incompleta elimina solo su intento y conserva
el último árbol `dist/<target>` exitoso y objetivos hermanos.

Para ganchos utilice `tsdownForgeHookPlugins`; for CMS projections use
`tsdownForgeCmsPlugins` de `@mission-platform/forge-cms-plugin-api`. no
llame a los ayudantes de generación mientras construye la configuración, y no introduzca
El marco cambia las tablas al compilador neutral.

## Verificación

Ejecute las suites Forge y CMS enfocadas antes de las compilaciones representativas del consumidor:

```bash
pnpm --filter @mission-platform/vite-plugin-forge test
pnpm --filter @mission-platform/forge-cms-plugin-api test
pnpm --filter @mission-platform/vite-plugin-forge build
```

La suite Forge cubre la ejecución diferida del ciclo de vida, claves de caché deterministas,
invalidación inversa, coordinación de objetivos concurrentes, declaración/artefacto CSS
publicación, seguridad del manifiesto y reversión en el directorio de destino publicado.
