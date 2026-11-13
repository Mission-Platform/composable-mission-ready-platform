# Develop Flint

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> packages/flint/core/docs/guides/development.md: [packages/flint/core/docs/guides/development.md](../../../guides/development.md)
> Idioma: Español (es)

Esta guía es para contribuyentes que cambian el analizador Flint, verificado
contratos o acuerdos de conformidad.

## Instalar y comprobar el paquete.

Desde la raíz del repositorio, instale las dependencias y ejecute las comprobaciones de paquetes:

```bash
pnpm install
pnpm --filter @mission-platform/flint build:check
pnpm --filter @mission-platform/flint test
```

Ejecute `pnpm --filter @mission-platform/flint build` antes de publicar.
La compilación emite el paquete seguro para el navegador y los archivos de declaración en `dist/`.

## Agregar un cambio de idioma

Actualice la gramática y la interfaz revisada juntas. Añade un dispositivo enfocado a
`src/fixtures/` y una prueba de regresión para diagnóstico o comportamiento generado.
Mantenga explícita la versión de idioma `1.0` y la versión ABI `1.2` a menos que el cambio sea
una revisión de compatibilidad intencional. Los cambios de ABI deben actualizar los manifiestos,
cargadores y la documentación de compatibilidad.

El paquete es seguro para el navegador. No agregue API exclusivas de Node a la fachada pública;
Las herramientas específicas de Node pertenecen a `@mission-platform/flint-cli`.

## Artefactos generados y fuente

Las fuentes `.flint` registradas en `src/self-hosted/fws/` son artefactos fuente,
JavaScript no copiado a mano. Mantenga la salida generada en `dist/` y no confirme
producción de compilación local. La referencia de la documentación del paquete se mantiene al lado
el paquete y será regenerado por el flujo de trabajo de extracción de documentación.

## Inspeccionando la tubería de dos etapas.

El límite de la interfaz canónica es el gráfico determinista Sea-of-Nodes. el
El gráfico se optimiza antes de bajar a Wasm IR, donde se aplica un segundo optimizador.
propagación segura en el backend, eliminación de códigos inactivos, simplificación de direcciones, conmutación
descenso y disposición determinista. Mantenga ambas etapas auditables: optimizador
Los informes y la política de límites seleccionada deben conservarse en los artefactos del compilador.

Utilice comprobaciones de límites en tiempo de ejecución a menos que una regla de producción de pruebas establezca cada
acceso como seguro. `proven-safe` y `excluded-by-profile` son políticas explícitas
valores, no comportamiento de liberación implícito. Un artefacto de caché `.sonir.json` es
únicamente datos de diagnóstico; los lectores deben validar su esquema, hashes, política y
límites antes de mostrarlo y nunca debe ejecutar el contenido del gráfico.

Para comprobaciones de humo CLI:

```bash
flint check src/example.flint --bounds-checks runtime --optimizer-report --format json
flint inspect-sonir .cache/example.sonir.json --format json
```

Al cambiar el análisis, agregue hechos y una prueba de diagnóstico estable antes de cambiar
una regla de optimización. El análisis del desarrollo debería exponer rangos desconocidos,
estados de alias/vida útil, cobertura de cambio y metadatos de transferencia; un análisis estricto debe
bloquear solicitudes de políticas de límites inseguros y violaciones de región/propiedad.
