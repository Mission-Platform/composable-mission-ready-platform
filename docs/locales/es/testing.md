# Pruebas en Mission Platform

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> Fuente en inglés: [docs/testing.md](../../testing.md)
> Idioma: Español (es)

Este documento describe la estrategia de prueba y las herramientas para el monorepo de Mission Platform. Sirve como **Instrucciones
guía** para tareas de prueba comunes y una **referencia técnica** para la configuración subyacente.

## Pila de pruebas

Mission Platform utiliza una pila de pruebas moderna y unificada basada en Vitest:

- **Vitest**: El ejecutor de pruebas principal para pruebas unitarias, de componentes y basadas en navegador.
- **@vue/test-utils**: biblioteca estándar para pruebas Vue componentes.
- **Vitest Modo de navegador (Dramaturgo)**: ejecución en navegador real para interacción y pruebas visuales cuando esté configurado.
- **Storybook Test Runner**: integración entre historias de Storybook y Vitest para pruebas de interacción automatizadas.

## Cómo hacerlo: ejecutar pruebas

Las pruebas se ejecutan a través de Turborepo para aprovechar el almacenamiento en caché y la ejecución consciente del espacio de trabajo.

### Ejecutar todas las pruebas

Para ejecutar todas las pruebas de unidades y componentes en todo el monorepo:

```bash
pnpm test
```

### Ejecutar pruebas para un espacio de trabajo específico

Para ejecutar pruebas para un único paquete o aplicación:

```bash
pnpm exec turbo run test --filter @mission-platform/<name>
```

### Ejecutar pruebas afectadas (estilo CI)
Para obtener comentarios locales más rápidos que coincidan con el CI `--affected` comportamiento:

```bash
pnpm exec turbo run test --affected
```

`--affected` selecciona tareas de prueba para espacios de trabajo modificados en relación con la revisión base del repositorio. Omitirlo para ejecutar cada
tarea de prueba del espacio de trabajo. La cobertura es específica del paquete; por ejemplo, el paquete de componentes proporciona:

```bash
pnpm --filter @mission-platform/components test:coverage
```

### Modo de vigilancia
Para el desarrollo, utilice el modo de vigilancia para volver a ejecutar pruebas sobre cambios de archivos:

```bash
pnpm --filter @mission-platform/components test:watch
```

### Informes de cobertura

Para generar un informe de cobertura utilizando el `v8` proveedor:

```bash
pnpm --filter @mission-platform/components test:coverage
```

Los informes se envían al `coverage/` directorio dentro de cada espacio de trabajo.

## Cómo hacerlo: escribir pruebas

### Pruebas unitarias y de componentes

Las pruebas se colocan junto con el código fuente y utilizan el `.spec.ts` (o `.spec.tsx`) extensión.

```typescript
import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import ForgeButton from './ForgeButton.vue';

describe('ForgeButton.vue', () => {
  it('renders props.label when passed', () => {
    const label = 'Click Me';
    const wrapper = mount(ForgeButton, {
      props: { label }
    });
    expect(wrapper.text()).toMatch(label);
  });

  it('emits click event when clicked', async () => {
    const wrapper = mount(ForgeButton);
    await wrapper.trigger('click');
    expect(wrapper.emitted()).toHaveProperty('click');
  });
});
```

### Pruebas del navegador

La plataforma Mission utiliza VitestModo de navegador para pruebas que requieren un entorno DOM real o entre navegadores
verificación.

1. Cree su archivo de prueba como de costumbre.
2. Asegurar el paquete `vitest.config.ts` habilita el modo navegador (consulte la referencia a continuación).
3. Corre con `pnpm test`.

## Referencia técnica

### Configuración compartida

La mayoría de los espacios de trabajo utilizan el `defineVitestConfig` utilidad de `@mission-platform/vite-config`. Esto proporciona una estandarización
ambiente:

- **Ambiente**: `jsdom` por defecto.
- **Globales**: habilitado (no es necesario importar `describe`, `it`, `expect` a menos que se desee).
- **Complementos**: Incluye `@vitejs/plugin-vue` y bloque i18n ignorando.
- **Cobertura**: Preconfigurada `v8` proveedor.

**Ejemplo `vitest.config.ts`:**

```typescript
import { defineVitestConfig } from '@mission-platform/vite-config/vitest';

export default defineVitestConfig({
  overrides: {
    // Package-specific overrides
  }
});
```

### Estructura del directorio

- `src/**/*.spec.ts`: Pruebas unitarias y pruebas de componentes.
- `src/**/*.stories.tsx`: Historias de libros de cuentos (también utilizadas como definiciones de pruebas de interacción).
- `apps/storybook/vitest.config.ts`: Configuración principal para pruebas de interacción basadas en navegador.

### Resumen de guiones

| Guión | Comando | Propósito |
|:----------------|:--------------------------|:--------------------------------------------|
| `test`          | `pnpm exec turbo run test`                              | Ejecute todas las tareas de prueba del espacio de trabajo.            |
| `test:watch`    | `pnpm --filter @mission-platform/components test:watch` | Ejecute pruebas de componentes en modo reloj.      |
| `test:coverage` | `pnpm --filter @mission-platform/components test:coverage` | Generar un informe de cobertura de componentes. |
| Óxido/WASM | `cargo test --workspace` | Ejecute pruebas de cajas nativas de Rust. |

Los paquetes contenedores de Wasm se prueban a través de las tareas de su paquete propietario. Por ejemplo, ejecute el paquete del escáner y su
contenedor juntos al cambiar el comportamiento del escáner:

```bash
pnpm exec turbo run test --filter @mission-platform/code-scanner...
```

## Documentación relacionada

- [Configuración de desarrollo](development-setup.md)
- [Mejores prácticas](best-practices.md)
- [Desarrollo de paquetes](package-development.md)
