# Scripts de utilidades compartidas

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> docs/configs/scripts-config.md: [docs/configs/scripts-config.md](../../../configs/scripts-config.md)
> Idioma: Español (es)

Esta guía permanece intencionalmente en el nivel de documentación del proyecto: `scripts/`
es un paquete de espacio de trabajo privado que contiene orquestación de repositorio en lugar de un
biblioteca publicable.
Los comandos específicos de paquetes y aplicaciones permanecen documentados junto a sus
poseer espacio de trabajo.

Mission Platform mantiene un conjunto de scripts de utilidad compartidos en la raíz
Directorio `scripts/`. Los scripts de sus paquetes se registran como tareas Turbo, mientras que
la raíz `package.json` expone contenedores de conveniencia que delegan en Turbo.

## Descripción general

Estos scripts automatizan tareas comunes de monorepo, como la configuración del desarrollo local y la verificación de compilaciones. Traducción
la extracción está definida por cada aplicación o paquete y orquestada desde la raíz del repositorio con Turborepo.

## Guiones disponibles

### Turbo familias de tareas

Utilice los contenedores raíz para las utilidades del repositorio siguientes. Cada comando es un
tarea separada, por lo que Turbo puede realizar un hash y programarla de forma independiente:

| Comando | Propósito | Política de caché |
| :----------------------------------- | :---------------------------------------------------------------- | :---------------------------------------------------------- |
| `pnpm validate` | Ejecute la verificación estática de propiedades de componentes independientes a través de Turbo. | La tarea se almacena en caché de forma independiente.                           |
| `pnpm docs:generate` | Generar documentación de referencia de paquetes y extensiones.           | Los archivos de referencia generados se almacenan en caché.                       |
| `pnpm validate:exports` | Verifique los mapas de exportación de paquetes y los objetivos creados.                     | Almacenable en caché cuando sus entradas no se modifican.                    |
| `pnpm validate:component-properties` | Verifique las declaraciones de propiedades de los componentes con los estilos fuente.      | Almacenable en caché y sin salida.                                  |
| `pnpm validate:inventory` | Producir el inventario de validación del tiempo de ejecución.                         | Artefactos almacenables en caché en `.artifacts/runtime-validation/`. |
| `pnpm validate:framework` | Validar la cobertura del tiempo de ejecución del marco.                              | Artefactos almacenables en caché en `.artifacts/runtime-validation/`. |
| `pnpm validate:app` | Validar la cobertura del tiempo de ejecución de la aplicación.                            | Artefactos almacenables en caché en `.artifacts/runtime-validation/`. |
| `pnpm validate:target` | Validar los objetivos de Storybook configurados.                            | Artefactos almacenables en caché en `.artifacts/runtime-validation/`. |
| `pnpm validate:runtime` | Ejecute el conjunto de validación de tiempo de ejecución completo.                            | No almacenado en caché porque inicia procesos de ejecución externos.    |
| `pnpm visual:parity` | Compare la salida renderizada de Storybook entre marcos.              | No almacenado en caché porque inicia servidores de desarrollo.           |
| `pnpm test:runtime-validation` | Ejecute las pruebas unitarias de validación de tiempo de ejecución enfocadas.                    | Almacenable en caché según las entradas de la tarea de prueba.                |

Las entradas de la tarea de utilidad se declaran en `turbo.json`; uso de entradas en todo el repositorio
`$TURBO_ROOT| `pnpm test:runtime-validation` | Ejecute las pruebas unitarias de validación de tiempo de ejecución enfocadas.                    | Almacenable en caché según las entradas de la tarea de prueba.                |

Las entradas de la tarea de utilidad se declaran en `turbo.json`; uso de entradas en todo el repositorio
 para que sigan siendo correctos cuando la tarea se ejecute desde `scripts/`
espacio de trabajo. El tiempo de ejecución generado y los artefactos visuales se escriben debajo
`.artifacts/` y no se tratan como entradas de origen.

`pnpm validate:exports` es intencionalmente una puerta posterior a la construcción separada porque
Comprueba los archivos en los directorios del paquete `dist/`. Ejecútelo después de `pnpm build`, como el
El trabajo de las puertas cromáticas estáticas funciona.
 `$TURBO_ROOT$`
### Extracción i18n (`i18n:extract`)

Cada aplicación o paquete que posee traducciones proporciona un script `i18n:extract` y `i18next.config.ts`. El comando escribe
paquetes de espacios de nombres en el directorio `locales/<locale>/` de cada espacio de trabajo. Ejecute la extracción para todos los espacios de trabajo configurados desde
la raíz del repositorio:

```bash
pnpm i18n:extract
```

### Generación de certificado de desarrollo (`generate-dev-cert.ts`)

Genera certificados SSL/TLS locales para desarrollo HTTPS. Esto es útil para probar funciones que requieren una conexión segura.
contexto (por ejemplo, acceso a la cámara a través de `@mission-platform/code-scanner`).

```bash
pnpm exec tsx scripts/generate-dev-cert.ts
```

### Verificación de resolución del marco (`verify-framework-resolution.mjs`)

Verifica que las exportaciones del paquete `@mission-platform/*` se resuelvan correctamente en la compilación del marco deseada (Vue, React, etc.)
en función de las condiciones de exportación del entorno.

```bash
node scripts/verify-framework-resolution.mjs
```

### Generación de documentación (`docs:generate`)

La generación de documentación es una tarea Turbo propiedad de `@mission-platform/scripts`.
La aplicación de documentos depende explícitamente de esa tarea, por lo que el desarrollo y la compilación
Los comandos no inician una compilación Turbo anidada.

## Métodos de ejecución

### A través del Administrador de paquetes

Las utilidades utilizadas con frecuencia están disponibles como scripts `pnpm` respaldados por Turbo en el
raíz `package.json`:

```bash
pnpm run <script-name>
```

Para una invocación con ámbito de paquete, utilice Turbo directamente:

```bash
pnpm exec turbo run validate:exports --filter=@mission-platform/scripts
```

### Ejecución directa

Los scripts TypeScript individuales se pueden ejecutar usando `tsx` o `node --experimental-strip-types`:

```bash
pnpm exec tsx scripts/<filename>.ts
```

## Pautas de contribución

Al agregar un nuevo script compartido:

- Colóquelo en el directorio `scripts/`.
- Utilice TypeScript siempre que sea posible.
- Si el script depende de paquetes externos, agréguelos al `package.json` del espacio de trabajo propietario.
- Documente el propósito y el uso del script en este archivo.
- Agregue una entrada correspondiente en la raíz `package.json` si es una utilidad de uso frecuente.
