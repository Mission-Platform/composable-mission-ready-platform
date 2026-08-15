# Guía de solución de problemas

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> Fuente en inglés: [docs/troubleshooting.md](../../troubleshooting.md)
> Idioma: Español (es)

Esta guía proporciona soluciones para problemas comunes encontrados durante el desarrollo, la construcción y la implementación dentro de la Misión.
Plataforma monorepo. Está estructurado como una **guía práctica** para diagnosticar y resolver problemas técnicos.

## Problemas de rendimiento

### LCP lento (pintura con contenido más grande)

**Problema**: LCP está por encima del umbral de 2,5 segundos para una calificación "Buena".

**Diagnóstico**:

1. Ejecute una auditoría de Lighthouse en Chrome DevTools.
2. Identifique el elemento LCP en el panel "Rendimiento".
3. Verifique la pestaña "Red" para ver si hay retrasos en la carga de recursos.

**Soluciones**:

- **CSS crítico en línea**: asegúrese de que los estilos necesarios para el contenido de la mitad superior de la página estén integrados.
- **Optimización de imagen**: utilice formatos WebP/AVIF y proporcione `srcset` para imágenes responsivas.
- **Precarga de recursos**: uso `<link rel="preload">` para la imagen LCP o fuentes críticas.
- **Minimizar el trabajo del hilo principal**: posponer JavaScript no esencial usando `async` o `defer`.

### Fugas de memoria

**Problema**: la aplicación consume cantidades cada vez mayores de memoria con el tiempo, lo que eventualmente provoca fallas.

**Diagnóstico**:

1. Tome varias "instantáneas del montón" en la pestaña Memoria de Chrome DevTools.
2. Compare instantáneas para identificar objetos que están creciendo en número o tamaño.
3. Busque "Elementos DOM separados".

**Soluciones**:

- **Limpieza en Composables**: borre siempre los temporizadores y elimine los detectores de eventos en `onUnmounted`.
- **Gestión de tiendas**: garantiza que el estado reactivo en Pinia u otras tiendas se borre cuando ya no sea necesario.
- **Eliminar Observables**: si usa RxJS, asegúrese de cancelar todas las suscripciones.

## Problemas de construcción y espacio de trabajo

### Errores de almacenamiento en caché de Turborepo

**Problema**: los cambios no se reflejan en la compilación o la compilación falla con artefactos obsoletos.

**Solución**: Fuerce una compilación nueva omitiendo el caché o borrelo manualmente.

```bash
# Force a build without cache
pnpm build:force

# Manually clear the turbo cache
rm -rf .turbo
```

### Módulo no encontrado/Resolución del espacio de trabajo

**Problema**: TypeScript o Vite No se puede encontrar un paquete definido en el espacio de trabajo.

**Soluciones**:

1. Verifique que el paquete aparezca en la lista del espacio de trabajo consumidor. `package.json`.
2. Asegúrese de que la versión coincida (`workspace:*` se recomienda).
3. correr `pnpm install` para actualizar los enlaces simbólicos.
4. Si los problemas persisten, intente una limpieza profunda:
```bash
   pnpm -r exec rm -rf node_modules
   pnpm install
   ```

### Errores de tipo en CI pero no locales

**Problema**: la compilación falla en CI con TypeScript errores que no aparecen en su IDE.

**Solución**: Ejecute el verificador de tipos localmente en todo el espacio de trabajo.

```bash
pnpm exec turbo run build:check
```

Esto garantiza que todos los límites del paquete se respeten correctamente y que los tipos se validen limpiamente.

## Solución de problemas del servidor MCP

### No se pudo conectar

**Problema**: Su cliente AI o IDE no puede conectarse al servidor MCP de Mission Platform.

**Diagnóstico**:

1. Verifique que el servidor MCP esté construido: `pnpm exec turbo run build --filter @mission-platform/mcp-*`.
2. Compruebe si el servidor se inicia manualmente: `node mcp/developer/dist/index.js`.

**Soluciones**:

- Asegúrese de que está utilizando la ruta absoluta al node binario y el script en la configuración de su cliente.
- Verifique los registros del servidor MCP para detectar mensajes de error específicos (por ejemplo, variables de entorno faltantes).

## Patrones de errores comunes

### "No se puede leer la propiedad de indefinido"

**Causa**: acceder a las propiedades de un objeto nulo o indefinido, a menudo antes de que los datos hayan terminado de cargarse. **Solución**: Usar
encadenamiento opcional (`?.`) o proporcionar valores predeterminados.

```typescript
// Instead of:
const name = user.profile.name;

// Use:
const name = user?.profile?.name ?? 'Guest';
```

### "Rechazo de promesa no controlado"

**Causa**: Una función asíncrona arrojó un error que no se detectó. **Solución**: incluir siempre las llamadas asíncronas en `try/catch` bloques.

```typescript
try {
  await fetchData();
} catch (error) {
  handleError(error);
}
```

## Recursos relacionados

- [Mejores prácticas](best-practices.md)
- [Configuración de desarrollo](development-setup.md)
- [Guía de prueba](testing.md)
