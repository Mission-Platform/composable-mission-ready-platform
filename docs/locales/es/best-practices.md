# Mejores prácticas de la plataforma de misión

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> docs/best-practices.md: [docs/best-practices.md](../../best-practices.md)
> Idioma: Español (es)

Este documento describe los principios básicos, la arquitectura y los estándares de codificación para el monorepo de Mission Platform. eso
Sirve como una **Explicación** de por qué seguimos ciertos patrones y una **Pauta** para el desarrollo del día a día.

## Principios básicos

### Arquitectura componible

Mission Platform sigue una arquitectura componible basada en paquetes. Bloques de construcción reutilizables (componentes de interfaz de usuario,
componibles, utilidades) viven en `packages/`, mientras que las aplicaciones implementables se ensamblan a partir de estos bloques en `apps/`.

### Disciplina de dependencia

Para mantener un monorepo mantenible, aplicamos un estricto flujo de dependencia unidireccional:

- **`apps`** → **`packages`**
- **`packages`** → paquetes de dominio de nivel inferior como **`core`**, **`tooling`** y **`compiler`**

**Regla:** El código en `packages/` **nunca** debe importarse desde `apps/`. Esto evita dependencias circulares y garantiza
Los paquetes siguen siendo verdaderamente reutilizables.

### Libro de cuentos como banco de trabajo

Al agregar o modificar componentes en `packages/`, use la aplicación Storybook (`apps/storybook`) como su desarrollo principal.
ambiente. La aplicación `apps/storybook` no contiene las historias en sí: es el banco de trabajo de agregación el que
descubre y representa las historias que conviven con sus componentes.

- Coubicar cada archivo `.stories.tsx` con su componente dentro del directorio del paquete de ese componente (p. ej.
  `packages/ui/components/src/components/**/<component>/<component>.stories.tsx`), no bajo `apps/storybook`. Esto coincide
  la convención en [Diseño de componentes atómicos](atomic-component-design.md).
- Verifique el comportamiento de los componentes en Vue, React, Svelte, Solid y componentes web cambiando el
  `STORYBOOK_FRAMEWORK` variable de entorno. Cada modo debe consumir el mismo inventario de historia neutral; un desaparecido
  El artefacto del marco es un error de paquete/exportación, no una razón para filtrar esa historia.

El ciclo de validación estático completo es:

```bash
for framework in vue react svelte solid web-component; do
  STORYBOOK_FRAMEWORK="$framework" pnpm --filter @mission-platform/storybook run build-storybook
done
```

## Estándares de desarrollo

### TypeScript En todas partes

Todo el código fuente nuevo debe escribirse en TypeScript (`.ts`) o Vue SFC con `<script setup lang="ts">`.

- **Modo estricto**: `strict: true` se aplica en todos los archivos `tsconfig.json`.
- **Tipos explícitos**: proporcione tipos explícitos para todas las API públicas, funciones exportadas y elementos componibles.
- **Evite `any`**: utilice tipos precisos o genéricos. Si un tipo es realmente desconocido, utilice `unknown` y realice una reducción de tipos.

### Componentes neutrales al marco

Siempre que sea posible, cree componentes de interfaz de usuario utilizando el dialecto `@mission-platform/forge-jsx`. Esto permite que los componentes sean
compilado y utilizado en Vue, React, Svelte, Solid y componentes web sin reescribir la lógica central. Configurar el
resolución del consumidor con la condición coincidente `mp:vue`, `mp:react`, `mp:svelte`, `mp:solid` o `mp:web-component`.

### Patrones de reactividad (Vue 3)

- Utilice la **API de composición** exclusivamente.
- Prefiera `ref()` para la mayoría de los estados para mantener la coherencia.
- Extraer lógica con estado compleja en **Composables** (`useXxx`).
- Asegúrese de que todos los efectos secundarios (observadores, intervalos, detectores de eventos) se limpien adecuadamente en `onUnmounted`.

## Flujo de trabajo de Monorepo

### Aislamiento de preocupaciones

- **Nuevos componentes de UI**: pertenecen a `packages/`.
- **Utilidades compartidas**: Pertenecen a `packages/`.
- **Lint/Format/Build Tooling**: las configuraciones compartidas pertenecen a `packages/tooling/configs/`.

### Linting y formato

El estilo de código coherente se aplica mediante ESLint y Prettier.

- Ejecute `pnpm lint` para comprobar si hay infracciones.
- Ejecute `pnpm format:write` para solucionar automáticamente los problemas de formato.
- Los mensajes de confirmación deben seguir la especificación **Commits convencionales**.

### Preparación de dependencias ascendentes y pruebas de paquetes

En un monorepo modular, los paquetes posteriores con frecuencia importan resultados de compilación (`dist/`) de los paquetes anteriores. Para eliminar errores en las pruebas de estado limpio y evitar realizar un seguimiento manual del orden de compilación de varios paquetes:

1. **Cebado de compilación ascendente automatizado (`^build`)**:
   Los gráficos de tareas `turbo.json` definen `test`, `build:check` y tareas de verificación con `"dependsOn": ["^build"]`. La ejecución de cualquier tarea de prueba o verificación de tipo a través de Turborepo crea automáticamente todas las dependencias del espacio de trabajo ascendente en primer lugar.

2. **Ejecución con alcance de paquete**:
   Para probar o crear un paquete individual sin compilar los requisitos previos manualmente:
   - Realizar pruebas con cebado:
     ```bash
     pnpm test:package <package-name>
     ```
     o directamente a través de Turborepo:
     ```bash
     pnpm exec turbo run test --filter <package-name>
     ```
   - Construir un paquete con sus dependencias:
     ```bash
     pnpm build:package <package-name>
     ```
     o directamente a través de Turborepo:
     ```bash
     pnpm exec turbo run build --filter <package-name>
     ```

   En los filtros Turbo, `<package-name>...` selecciona el paquete Y su flujo ascendente
   dependencias, `...<package-name>` selecciona el paquete Y su flujo descendente
   dependientes, y `<package-name>^...` selecciona solo los dependientes ascendentes del paquete
   dependencias (excluyendo el paquete en sí). Los ayudantes del paquete se ejecutan explícitamente
   el formulario ascendente (`<package-name>^...`) primero para dirigir los flujos de trabajo del paquete
   tener un calentamiento predecible y almacenable en caché; dependencia `^build` del gráfico de tareas
   sigue siendo la red de seguridad para las invocaciones directas de Turborepo.

3. **Aprovisionamiento del árbol de trabajo**:
   Cuando se aprovisionan nuevos árboles de trabajo de Git a través de `pnpm worktree:create` o se inicializan a través de `pnpm worktree:setup`, las dependencias ascendentes se preparan automáticamente antes de ejecutar comprobaciones de validación, lo que garantiza que los árboles de trabajo recién creados estén operativos de inmediato.

## Optimización del rendimiento

- **División de código**: utilice `import()` dinámico para funciones no críticas y bibliotecas grandes.
- **Optimización de activos**: prefiera formatos de imagen modernos (WebP/AVIF) y asegúrese de que todos los activos estáticos estén comprimidos.
- **Sobrecarga de reactividad**: utilice `shallowRef` para objetos grandes que no requieren reactividad profunda.

## Pruebas y documentación

- **Desarrollo basado en pruebas**: cada característica nueva o corrección de errores debe ir acompañada de pruebas unitarias (`.spec.ts`).
- **Documentación Diátaxis**: Documentación del autor siguiendo el marco Diátaxis (Tutoriales, How-to, Referencia,
  Explicación).
- **TSDoc**: use TSDoc/JSDoc para todos los métodos y propiedades públicos para potenciar la inteligencia IDE.

## Recursos relacionados

- [Guía de pruebas](testing.md)
- [Mejores prácticas del marco](framework-best-practices.md)
- [Estructura del espacio de trabajo](workspace-structure.md)
- [Solución de problemas](troubleshooting.md)
