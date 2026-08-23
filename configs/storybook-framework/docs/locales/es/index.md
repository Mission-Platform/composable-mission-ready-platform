# @mission-platform/storybook-framework

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> configs/storybook-framework/docs/index.md: [configs/storybook-framework/docs/index.md](../../index.md)
> Idioma: Español (es)

Marco Storybook seleccionado por el entorno preestablecido para Mission Platform.

## Instalar y usar

Agregue el paquete al espacio de trabajo de Storybook y haga referencia a él desde
`.storybook/main.ts` o la configuración de Storybook correspondiente. Seleccione el
marco a través de las condiciones soportadas del espacio de trabajo; no codificar un
adaptador de marco en paquetes de componentes compartidos.

## Contribuir

Correr `pnpm --filter @mission-platform/storybook-framework lint` y el
Comprobaciones de construcción de libros de cuentos. Mantenga este paquete centrado en la selección del marco y
valores predeterminados compartidos del libro de cuentos; Las historias componentes pertenecen a `apps/storybook`.
