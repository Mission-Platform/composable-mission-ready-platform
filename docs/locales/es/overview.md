# Descripción general de la plataforma de la misión

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> docs/overview.md: [docs/overview.md](../../overview.md)
> Idioma: Español (es)

Mission Platform es una plataforma de componentes componible, basada en paquetes y de marco neutral, diseñada para construir
Aplicaciones listas para producción con bloques de construcción reutilizables. Aprovecha una arquitectura monorepo moderna para proporcionar una
Entorno de desarrollo altamente eficiente para ecosistemas complejos de múltiples aplicaciones.

## La filosofía componible

En esencia, Mission Platform se basa en el principio de **composición sobre herencia**. En lugar de proporcionar un
marco monolítico que dicta la estructura de la aplicación, la plataforma ofrece un conjunto de aplicaciones pequeñas, enfocadas y altamente
paquetes interoperables.

### Bloques de construcción componibles

Las aplicaciones se ensamblan a partir de paquetes compartidos, lo que garantiza una lógica común, desde los componentes de la interfaz de usuario hasta la internacionalización.
y enrutamiento: se crea una vez y se reutiliza en todas partes. Este enfoque reduce la duplicación, simplifica el mantenimiento y
garantiza una experiencia de usuario consistente en todo el conjunto de productos.

### Marco múltiple por diseño

Mission Platform introduce un paradigma de desarrollo neutral en cuanto al marco. Usando el dialecto `@mission-platform/forge` JSX,
los desarrolladores pueden crear componentes una vez y compilarlos en salidas nativas para Vue 3, React, Solid, Svelte y Web.
Componentes. Esto prepara el código base para el futuro y permite una integración perfecta en diversos entornos frontend.

### Base de tipo seguro

Toda la plataforma está creada en **TypeScript**, lo que proporciona una experiencia de desarrollador sólida y autodocumentada. Explícito
Escribir en todas las API públicas garantiza que los errores se detecten en tiempo de compilación, lo que aumenta significativamente el desarrollo.
velocidad y calidad del código.

## Características clave

| Característica | Descripción |
|:----------------------|:---------------------------------------------------------------------------------------------------------------------------------------|
| **Tiempo de ejecución Forge JSX** | Un dialecto JSX neutral en el marco: cree una vez y cree para Vue 3, React, Svelte, Solid y componentes web sin sobrecarga de tiempo de ejecución. |
| **Biblioteca de componentes** | Un conjunto completo de diseño, tipografía y componentes interactivos creados una vez para múltiples marcos.                           |
| **Fichas de diseño** | Un sistema de tokens compatible con DTCG que genera artefactos SCSS y TypeScript para una temática coherente.                                     |
| **Enrutamiento agnóstico** | Un sistema de enrutamiento con seguridad de tipos que funciona independientemente del marco de la interfaz de usuario.                                                               |
| **Universal I18n** | Un contenedor de internacionalización independiente del marco basado en i18next con adaptadores Vue y React dedicados.                              |
| **Servicios de lavado** | Utilidades de alto rendimiento para escaneo de códigos de barras, revisión ortográfica y más, con tecnología de WebAssembly.                                     |

## Pila de tecnología

Mission Platform se basa en una pila moderna y de alto rendimiento:

- **Forge JSX (`@mission-platform/forge`)**: el marco de interfaz de usuario principal: un tiempo de ejecución JSX neutral en el marco en el que todos
  Los componentes compartidos (todo excepto las aplicaciones) son de creación.
- **Vue 3**: el marco con el que se construyen las aplicaciones en `apps/` y uno de varios objetivos de renderizado nativos para
  Componentes de forja.
- **TypeScript**: El estándar para todo el código fuente.
- **Vite**: la herramienta de compilación que impulsa HMR rápido y paquetes de producción optimizados.
- **pnpm Espacios de trabajo**: gestión eficiente de dependencias con archivos de bloqueo compartidos.
- **Turborepo**: orquestación de tareas y almacenamiento en caché de alto rendimiento.
- **Cloudflare Workers/Pages**: el objetivo de implementación principal para aplicaciones y API.
- **Storybook**: el banco de trabajo para el desarrollo de componentes y pruebas visuales.

## Estructura del ecosistema

El repositorio está organizado en varias áreas distintas:

- **`apps/`**: aplicaciones implementables (por ejemplo, `my-care-notes`, `website`) que componen paquetes en productos.
- **`packages/`**: Los componentes básicos, incluidos `@mission-platform/components`, `@mission-platform/router` y
  `@mission-platform/i18n`.
- **`configs/`**: Configuraciones compartidas para ESLint, Prettier, TypeScript y Vite.
- **`vite-plugins/`**: herramientas personalizadas en tiempo de compilación para tokens de diseño, compilación de Forge y SEO.
- **`workers/`**: Cloudflare Workers que proporciona lógica de backend y capacidades de servicio de SPA.

## Próximos pasos

Para comenzar a desarrollar en Mission Platform, consulte las siguientes guías:

- **[Configuración de desarrollo](development-setup.md)**: Prepare su entorno e instale las dependencias.
- **[Arquitectura](architecture.md)**: Profundice en los principios de diseño y el flujo de dependencia de la plataforma.
- **[Estructura del espacio de trabajo](workspace-structure.md)**: Comprenda el diseño del directorio y las convenciones del paquete.
- **[Pruebas](testing.md)**: Conozca nuestras estrategias y herramientas de prueba.
