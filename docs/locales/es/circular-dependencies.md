# Gestión de dependencia circular

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> docs/circular-dependencies.md: [docs/circular-dependencies.md](../../circular-dependencies.md)
> Idioma: Español (es)

Este documento explica el impacto de las dependencias circulares dentro del monorepo de Mission Platform y proporciona un **Cómo hacerlo
Guía** para detectarlos, resolverlos y prevenirlos. Sirve como **Explicación** del estado de monorepo y como
receta técnica para la refactorización.

## ¿Qué son las dependencias circulares?

Una dependencia circular ocurre cuando dos o más paquetes dependen entre sí, ya sea directa o indirectamente. Por ejemplo:

- El paquete A se importa del paquete B.
- El paquete B se importa del paquete A.

En un monorepo, estos ciclos son particularmente dañinos porque pueden causar:

- **Fallas de compilación**: resolución del gráfico de dependencia (por ejemplo, por Turborepo o pnpm) puede estancarse o fracasar.
- **Errores de tiempo de ejecución**: un módulo puede inicializarse parcialmente cuando el otro intenta utilizar sus exportaciones.
- **Aumento del acoplamiento**: los paquetes se vuelven imposibles de usar o probar de forma aislada.

## Detección

Mission Platform utiliza varias herramientas automatizadas para detectar dependencias circulares antes de que lleguen a producción.

### ESLint `no-restricted-paths`

nuestro compartido ESLint La configuración impone el flujo de dependencia unidireccional. Si intenta importar desde un paquete que
debería estar "por encima" del suyo en la jerarquía, el linter arrojará un error.

Ejecute el linter para comprobar si hay infracciones:

```bash
pnpm lint
```

### Auditoría manual con Madge

Para ciclos complejos que abarcan varios archivos, puede utilizar `madge` (si está instalado) o visualizadores similares para mapear el
gráfico de dependencia.

## Cómo hacerlo: Resolver dependencias circulares

Cuando se detecte una dependencia circular, utilice una de las siguientes estrategias para resolverla.

### Estrategia 1: extraer código compartido (recomendado)

Si el Paquete A y el Paquete B necesitan una parte común de lógica, mueva esa lógica a un nuevo paquete de nivel inferior (por ejemplo,
`packages/utils-shared`).

**Antes**:

- Paquete A ↔ Paquete B

**Después**:

- Paquete A → Paquete C
- Paquete B → Paquete C

### Estrategia 2: inversión de dependencia

En lugar de importar el Paquete B directamente desde el Paquete A, haga que el Paquete B acepte la funcionalidad requerida como accesorio, un
objeto de configuración, o mediante un bus de eventos.

**Ejemplo**:
en lugar de `AuthService` importador `UserService` para actualizar un perfil, `AuthService` puede emitir un `AUTH_SUCCESS` evento
eso `UserService` escucha.

### Estrategia 3: Consolidación

Si dos paquetes están tan estrechamente acoplados que constantemente necesitan las partes internas del otro, en realidad podrían ser una
unidad lógica única. Considere fusionarlos en un solo paquete.

## Mejores prácticas de prevención

1. **Siga el flujo unidireccional**: respete estrictamente el `Apps → Packages → Configs` dirección de dependencia.
2. **Marco de autor: lógica neutral**: uso `@mission-platform/forge` para que la lógica central evite ciclos específicos del marco.
3. **Utilice protocolos de espacio de trabajo**: utilice siempre `workspace:*` para dependencias internas para asegurar pnpm puede resolver correctamente
   el gráfico.
4. **Audite las importaciones periódicamente**: preste atención a las sugerencias de "importación automática" en su IDE, ya que a veces pueden introducir
   dependencias no deseadas entre paquetes.

## Documentación relacionada

- [Mejores prácticas](best-practices.md)
- [Estructura del espacio de trabajo](workspace-structure.md)
- [Guía de solución de problemas](troubleshooting.md)
