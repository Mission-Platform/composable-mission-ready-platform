# Scripts de utilidades compartidas

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> Fuente en inglés: [docs/configs/scripts-config.md](../../../configs/scripts-config.md)
> Idioma: Español (es)

Mission Platform mantiene un conjunto de scripts de utilidad compartidos en la raíz `scripts/` directorio, gestionado por el
`@mission-platform/scripts` paquete.

## Descripción general

Estos scripts automatizan tareas comunes de monorepo, como la configuración del desarrollo local y la verificación de compilaciones. Traducción
la extracción está definida por cada aplicación o paquete y orquestada desde la raíz del repositorio con Turborepo.

## Guiones disponibles

### Extracción i18n (`i18n:extract`)

Cada aplicación o paquete que posee traducciones proporciona una `i18n:extract` guión y `i18next.config.ts`. El comando escribe
paquetes de espacios de nombres debajo de cada espacio de trabajo `locales/<locale>/` directorio. Ejecute la extracción para todos los espacios de trabajo configurados desde
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

### Verificación de Resolución Marco (`verify-framework-resolution.mjs`)

Verifica que `@mission-platform/*` las exportaciones de paquetes se resuelven correctamente en la compilación del marco prevista (Vue, React, etc.)
en función de las condiciones de exportación del entorno.

```bash
node scripts/verify-framework-resolution.mjs
```

## Métodos de ejecución

### A través del Administrador de paquetes

La mayoría de los scripts están disponibles como `pnpm` scripts en la raíz `package.json`:

```bash
pnpm run <script-name>
```

### Ejecución directa

Individual TypeScript Los scripts se pueden ejecutar usando `tsx` o `node --experimental-strip-types`:

```bash
pnpm exec tsx scripts/<filename>.ts
```

## Pautas de contribución

Al agregar un nuevo script compartido:

- Colóquelo en el `scripts/` directorio.
- Usar TypeScript donde sea posible.
- Si el script depende de paquetes externos, agréguelos al espacio de trabajo propietario. `package.json`.
- Documente el propósito y el uso del script en este archivo.
- Agregar una entrada correspondiente en la raíz `package.json` si es una utilidad de uso frecuente.
