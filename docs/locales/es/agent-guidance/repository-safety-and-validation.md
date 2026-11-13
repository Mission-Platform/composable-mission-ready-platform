# Seguridad y validación del repositorio

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> docs/agent-guidance/repository-safety-and-validation.md: [docs/agent-guidance/repository-safety-and-validation.md](../../../agent-guidance/repository-safety-and-validation.md)
> Idioma: Español (es)

Este tema es obligatorio para tareas de implementación, refactorización, pruebas, generación, inspección de repositorio, árbol de trabajo, LSP, seguridad y administración de archivos. Conserva las restricciones operativas detalladas resumidas en la raíz `AGENTS.md`.

## Dirección de dependencia y descubrimiento de activos

- El código en `packages/` nunca debe importarse desde `apps/`. Las aplicaciones consumen miembros de paquetes reutilizables; Los paquetes de dominio pueden depender de `core`, `tooling` y contratos de compilador de nivel inferior sin importar aplicaciones.
- Antes de escribir código, inspeccione los activos existentes con las herramientas MCP del repositorio (`list_components`, `get_component_usage`, `lsp_find_symbol` y `lsp_list_symbols`) y la inspección del sistema de archivos.
- Reutilice `@mission-platform/components` en lugar de crear primitivas de UI duplicadas, haga referencia a tokens `--mp-*` en lugar de valores visuales codificados, busque `packages/` para utilidades compartidas y use catálogos YAML con `@mission-platform/i18n` para cadenas orientadas al usuario.
- Los nuevos componentes de UI compartidos, elementos componibles, utilidades y tokens de diseño pertenecen a `packages/`; Las herramientas compartidas de pelusa, formato y compilación pertenecen a `packages/tooling/configs/`.
- Al modificar un componente del paquete, agregue o actualice su historia `.stories.tsx` colocada. El banco de trabajo `apps/storybook` descubre historias de paquetes en Vue, React, Solid, Svelte y componentes web.

## Codificación segura y cumplimiento

Todo el código y la configuración deben seguir ISO/IEC 27001:2022 Control A.8.28 y proteger contra OWASP Top 10 (2025) y CWE Top 25.

- Nunca confirmes credenciales, claves privadas, tokens de nube u otros secretos.
- Desinfecte HTML con `DOMPurify.sanitize`, parametrice consultas y utilice argumentos vectoriales como `execFile` en lugar de cadenas de shell interpoladas.
- Utilice criptografía moderna como SHA-256 y `crypto.getRandomValues`; nunca utilice `Math.random()` para valores sensibles a la seguridad.
- Evite scripts de ciclo de vida `postinstall` no examinados y dependencias de pines a través de referencias de catálogo.
- Preservar privilegios mínimos, límites de ruta y raíz del repositorio, ejecución sin shell, aprobación de escritura explícita y límites de herramientas de seguridad.
- Antes de proponer un PR, ejecute las comprobaciones de seguridad de desarrollador-MCP pertinentes: `security_scan_secrets`, `security_analyze_code`, `security_audit_dependencies`, `security_audit_supply_chain`, `security_collect_compliance_evidence` y `security_audit_compliance` cuando corresponda.

## Árboles de trabajo y dependencias de compilación

- Los flujos de trabajo paralelos deben utilizar árboles de trabajo Git aislados provistos con `node --experimental-strip-types scripts/worktree-manager.ts create <branch>`.
- En un árbol de trabajo nuevo, cree dependencias del espacio de trabajo ascendente antes de las pruebas de paquetes o comprobaciones de tipos porque es posible que falten artefactos internos `dist/`:

  ```bash
  pnpm exec turbo run build --filter <package-name>^...
  ```

- Los árboles de trabajo comparten `.turbo/cache`; no borre ni omita ese caché.

## Configuración LSP portátil

- Las definiciones de LSP en `agent-lsp.json` deben utilizar invocaciones relativas portátiles como `["pnpm", "exec", "<server>", "--stdio"]` o `["pnpm", "--dir", "relative/path", ...]`.
- Nunca codifique rutas absolutas del sistema. El servidor MCP LSP ejecuta servidores de idiomas desde el repositorio detectado o la raíz del árbol de trabajo.
- Las herramientas de consulta y ejecución de LSP requieren una sesión activa. Verifique `lsp_status` y use `lsp_start` cuando sea necesario.
- El servidor nativo TypeScript 7 utiliza `tsc --lsp --stdio` (`typescript-go` 7.0.2). Las consultas de símbolo de todo el espacio de trabajo y de desplazamiento pueden expirar durante la indexación; utilice tiempos de espera de protocolo de 15 000 a 30 000 ms y complételos con comprobaciones de tipo en el ámbito del paquete y Vitest.
- Si se agota el tiempo de inicio o descubrimiento, utilice comprobaciones de tipo en el ámbito del paquete y Vitest como respaldo de diagnóstico en lugar de bloquear la tarea.

## Validación de Flint y escáner

- Los diagnósticos de Flint LSP son solo comentarios a nivel de fuente; no prueban que un gráfico de múltiples módulos vinculado emita Wasm válido o que su ABI en tiempo de ejecución se ejecute correctamente.
- Para cambios en los gráficos del escáner, ejecute el paquete de gráficos enfocados, el paquete `type-check` y el paquete Vitest. Registre las fallas de emisión de artefactos por separado de los diagnósticos de origen.
- Un dispositivo o una ruta de decodificador reducida no establece una paridad ZXing completa. Marque los modos no compatibles, los subconjuntos de formatos, los metadatos, los reintentos y las migraciones de contratos públicos de forma explícita en el plan y la solicitud de extracción.
- Si falla el enlace estático, capture el módulo gráfico y los recuentos de bordes, el diagnóstico del emisor y el reproductor aislado más pequeño antes de cambiar el código del algoritmo o debilitar las pruebas.

## Estilo de código y verificación

- Los nuevos archivos fuente utilizan `.ts` o `.vue` con `<script setup lang="ts">`; Las API públicas y las funciones exportadas necesitan tipos explícitos.
- Utilice `undefined` para valores ausentes o borrados a menos que un protocolo externo requiera `null`.
- Los accesorios de eventos de Forge JSX utilizan nombres camelCase estándar como `onKeyDown`, `onPointerDown` y `onMouseDown`.
- Importaciones de grupo en este orden sin líneas en blanco dentro de un grupo: Node integrados, dependencias externas, paquetes internos `@mission-platform/*` y archivos relativos. Separe los grupos con una línea en blanco.
- Ejecute `pnpm --filter <pkg> run lint` y `pnpm --filter <pkg> run lint:style`; utilice el paquete ESLint para corregir solo los errores de estilo aplicables. Markdown y las historias utilizan el flujo de trabajo de formato del repositorio.
- Los cambios del compilador, transpilador, AST y generación de código requieren una cobertura de integración de un extremo a otro. Verifique que las salidas no colisionen para nombres base idénticos, reexportaciones de entradas inequívocas y contenidos emitidos preservados.
- `TargetIntentions.lowered` es obligatorio en `@mission-platform/forge-plugin-api`; Los complementos de destino requieren planes reducidos. Los accesorios, simulaciones y complementos de integración de CMS deben proporcionar `{ framework, appliedOptimizations: [] }` o ejecutar `lower -> optimize -> generate`.
- Bajo carga paralela, pruebas de múltiples marcos, extracción de documentación y AST de gran tamaño deben utilizar tiempos de espera de ms `60_000`–`120_000` explícitos.
- Para el trabajo del plan transversal, utilice una revisión independiente centrada en el comportamiento de un extremo a otro, pruebas negativas y puertas de pelusa con alcance de paquete.

## Modos de interacción

Utilice el primer modo aplicable y consérvelo para la sesión a menos que su regla de persistencia permita un cambio:

1. `[CHAT]` para saludos, charlas triviales, preguntas objetivas o matemáticas simples.
2. `[ADVANCED_CHAT]` para explicaciones, análisis, búsqueda de información o propuestas de solo lectura.
3. `[RUN_VERIFY]` para comandos cortos, ejecuciones de aplicaciones o pruebas seguras sin modificaciones.
4. `[FAST_CODE]` para un cambio trivial de un archivo que no necesita recopilación de contexto adicional.
5. `[SETUP]` para compilaciones, instalaciones, infraestructura, correcciones ambientales o comprobaciones del sistema.
6. `[CODE]` para cambios de proyecto no triviales que requieren investigación o múltiples pasos.
7. `[NICHE]` solo para investigación forense especializada, ingeniería inversa, recuperación de datos o investigación de seguridad que no se ajuste a otra modalidad.

`[CHAT]` y `[CODE]` no cambian de modo. `[ADVANCED_CHAT]` cambia a `[CODE]` sólo después de una solicitud de implementación explícita; `[FAST_CODE]` y `[RUN_VERIFY]` cambian a `[CODE]` si no pueden terminar en tres pasos; `[SETUP]` y `[NICHE]` pueden cambiar a `[CODE]` cuando la implementación sea necesaria.

## Generación atómica y gestión de archivos

- Nunca borre ni elimine un objetivo de generación antes de una generación exitosa. Organice los artefactos en un directorio de intentos hermanos como `.forge-attempt/`, ejecute diagnósticos previos a la confirmación e intercambie atómicamente solo después de pasar las comprobaciones.
- Preservar los archivos de puntos del repositorio como `.gitkeep` y `.gitignore`, y preservar los directorios de preparación en tránsito al sincronizar o podar los objetivos de compilación.
- Mantener las mutaciones explícitas y acotadas. No utilice comandos de limpieza amplios ni elimine archivos que no se crearon para la tarea actual.

## Contrato de flujo de trabajo de desarrollador MCP LSP

Prefiera las herramientas de inteligencia de código `lsp_*` limitadas del MCP del desarrollador a la búsqueda manual de texto para tareas de código. Utilice `lsp_capabilities` para confirmar el contrato actual y la disponibilidad; antes de editar, use `lsp_review_structure` o `lsp_debug_context` de solo lectura, antes de aplicar una edición LSP use `lsp_preview_edit` y después de un cambio use `lsp_get_diagnostics`, luego `lsp_run_build` y `lsp_run_tests` cuando corresponda.

Utilice el mapeo especialmente diseñado: `lsp_list_symbols` para estructura, `lsp_find_symbol` para símbolos, `lsp_find_references` para usos, `lsp_inspect_symbol` para comprensión, `lsp_find_callers` para sitios de llamadas, `lsp_replace_symbol_body` para reemplazo de funciones y `lsp_safe_delete_symbol` para símbolos no utilizados. Utilice los flujos de trabajo documentados `/lsp-*` para arquitectura, impacto, refactorización, ediciones seguras, correlación de pruebas y verificación completa.

Política relacionada: [rúbrica de calidad](quality-rubric.md), [Autorevisión de sesión](session-self-review.md) y la raíz [AGENTS.md](../../../../AGENTS.md).
