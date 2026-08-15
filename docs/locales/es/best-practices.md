# Mejores prácticas de la plataforma de misión

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> Fuente en inglés: [docs/best-practices.md](../../best-practices.md)
> Idioma: Español (es)

Este documento describe los principios básicos, la arquitectura y los estándares de codificación para el monorepo de Mission Platform. eso
Sirve como una **Explicación** de por qué seguimos ciertos patrones y una **Pauta** para el desarrollo del día a día.

## Principios básicos

### Arquitectura componible

Mission Platform sigue una arquitectura componible basada en paquetes. Bloques de construcción reutilizables (componentes de interfaz de usuario,
componibles, utilidades) viven en `packages/`, mientras que las aplicaciones implementables se ensamblan a partir de estos bloques en `apps/`.

### Disciplina de dependencia

Para mantener un monorepo mantenible, aplicamos un estricto flujo de dependencia unidireccional:

- **`apps`** → **`packages`** / **`vite-plugins`** / **`workers`**
- **`packages`** / **`vite-plugins`** / **`workers`** → **`configs`**
- **`apps`** → **`configs`** (Directamente para herramientas/configuración de compilación)

**Regla:** Código en `packages/` **nunca** debe importar desde `apps/`. Esto evita dependencias circulares y garantiza
Los paquetes siguen siendo verdaderamente reutilizables.

### Libro de cuentos como banco de trabajo

Al agregar o modificar componentes en `packages/`, utiliza la aplicación Storybook (`apps/storybook`) como tu desarrollo principal
ambiente. El `apps/storybook` La aplicación no contiene las historias en sí: es el banco de trabajo de agregación el que
descubre y representa las historias que conviven con sus componentes.

- Co-ubicar cada uno `.stories.tsx` archivo con su componente dentro del directorio del paquete de ese componente (p. ej.
  `packages/components/src/components/**/<component>/<component>.stories.tsx`), no bajo `apps/storybook`. Esto coincide
  la convención en [Diseño de componentes atómicos](atomic-component-design.md).
- Verificar el comportamiento de los componentes en Vue, React, Svelte, Solidy componentes web cambiando el
  `STORYBOOK_FRAMEWORK` variable de entorno. Cada modo debe consumir el mismo inventario de historia neutral; un desaparecido
  El artefacto del marco es un error de paquete/exportación, no una razón para filtrar esa historia.

El ciclo de validación estático completo es:

```bash
for framework in vue react svelte solid web-component; do
  STORYBOOK_FRAMEWORK="$framework" pnpm --filter @mission-platform/storybook run build-storybook
done
```

## Estándares de desarrollo

### TypeScript En todos lados

Todo el código fuente nuevo debe escribirse en TypeScript (`.ts`) o Vue SFC con `<script setup lang="ts">`.

- **Modo estricto**: `strict: true` se aplica en todos `tsconfig.json` archivos.
- **Tipos explícitos**: proporcione tipos explícitos para todas las API públicas, funciones exportadas y elementos componibles.
- **Evitar `any`**: Utilice tipos precisos o genéricos. Si un tipo es realmente desconocido, utilice `unknown` y realizar un estrechamiento de tipos.

### Componentes neutrales al marco

Siempre que sea posible, cree componentes de la interfaz de usuario utilizando el `@mission-platform/forge` dialecto. Esto permite que los componentes sean
compilado y utilizado en Vue, React, Svelte, Solidy componentes web sin reescribir la lógica central. Configurar el
solucionador del consumidor con la coincidencia `mp:vue`, `mp:react`, `mp:svelte`, `mp:solid`, o `mp:web-component` condición.

### Patrones de reactividad (Vue 3)

- Utilice la **API de composición** exclusivamente.
- Preferir `ref()` para que la mayoría de los estados mantengan la coherencia.
- Extraer lógica con estado compleja en **Composables** (`useXxx`).
- Asegúrese de que todos los efectos secundarios (observadores, intervalos, oyentes de eventos) se limpien adecuadamente en `onUnmounted`.

## Flujo de trabajo de Monorepo

### Aislamiento de preocupaciones

- **Nuevos componentes de la interfaz de usuario**: pertenecen a `packages/`.
- **Utilidades compartidas**: pertenecen a `packages/`.
- **Lint/Format/Build Tooling**: las configuraciones compartidas pertenecen a `configs/`.

### Linting y formato

El estilo de código consistente se aplica a través de ESLint y Prettier.

- Correr `pnpm lint` para comprobar si hay violaciones.
- Correr `pnpm format:write` para solucionar automáticamente problemas de formato.
- Los mensajes de confirmación deben seguir la especificación **Commits convencionales**.

## Optimización del rendimiento

- **División de código**: uso dinámico `import()` para funciones no críticas y bibliotecas grandes.
- **Optimización de activos**: prefiera formatos de imagen modernos (WebP/AVIF) y asegúrese de que todos los activos estáticos estén comprimidos.
- **Gastos generales de reactividad**: uso `shallowRef` para objetos grandes que no requieren reactividad profunda.

## Pruebas y documentación

- **Desarrollo basado en pruebas**: cada característica nueva o corrección de errores debe ir acompañada de pruebas unitarias (`.spec.ts`).
- **Documentación Diátaxis**: Documentación del autor siguiendo el marco Diátaxis (Tutoriales, How-to, Referencia,
  Explicación).
- **TSDoc**: utilice TSDoc/JSDoc para todos los métodos y propiedades públicos para potenciar la inteligencia IDE.

## Recursos relacionados

- [Guía de prueba](testing.md)
- [Mejores prácticas del marco](framework-best-practices.md)
- [Estructura del espacio de trabajo](workspace-structure.md)
- [Solución de problemas](troubleshooting.md)
