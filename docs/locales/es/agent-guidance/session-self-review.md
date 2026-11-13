# Autoevaluación de la sesión

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> docs/agent-guidance/session-self-review.md: [docs/agent-guidance/session-self-review.md](../../../agent-guidance/session-self-review.md)
> Idioma: Español (es)

Complete esta revisión al final de cada sesión, ya sea que la tarea haya tenido éxito, haya fallado o se haya detenido antes de su implementación. La revisión es un registro de cierre, no un permiso para expandir la tarea actual.

## Revisión de resultados

Registre evidencia concisa para:

- Qué se intentó y qué resultado se solicitó.
- Comportamiento esperado versus comportamiento observado.
- Supuestos que fueron confirmados, refutados o dejados inciertos.
- Fracasos, trabajo bloqueado, regresiones y riesgos no resueltos.
- Verificación realizada, incluyendo comandos, pruebas, diagnósticos, escaneos, revisiones y sus resultados.
- Si la diferencia final está enfocada, es portátil, está libre de artefactos temporales y es coherente con las convenciones del repositorio.
- Qué orientaciones permitieron el trabajo y qué instrucciones eran ambiguas, difíciles de descubrir, duplicadas, obsoletas o innecesariamente costosas.

Preservar las convenciones que funcionaron. Distinga los problemas observados de las hipótesis o ideas de mejora especulativas e incluya la evidencia que respalda cada cambio propuesto.

## Revisión de MCP

Cuando se utilizaron herramientas o perfiles de MCP, responda estas preguntas:

- ¿El perfil seleccionado era el perfil mínimo que podría completar la tarea?
- ¿Se prefirieron las herramientas de inspección limitadas y de solo lectura hasta que fue necesaria una escritura explícita?
- Eran `review_changes` ¿Y los controles de seguridad disponibles son suficientes para inspeccionar la mutación propuesta y sus riesgos?
- ¿Un esquema, límite de salida, límite de paginación, tiempo de espera o ergonomía de la herramienta crearon fricción u ocultaron evidencia útil?
- ¿Alguna ruta de escritura requirió una confirmación más clara, límites más estrechos, un aislamiento más fuerte o un respaldo más seguro?
- ¿La terminología y el comportamiento coincidieron? `mcp/README.md`, `mcp/developer/README.md`, `.ai/mcp/mcp.json`, `scripts/launch-mcp.mjs`, `mcp/developer/src/tools/profiles.ts`, y `mcp/developer/src/tools/index.ts`?

No propongas un perfil más amplio o una nueva herramienta simplemente porque sea conveniente. Explique el cambio más pequeño que eliminaría un problema observado de seguridad, confiabilidad o comprensión.

## Decisión de mejora

Clasifique cada oportunidad de mejora:

- **Seguimiento de la documentación:** utilícelo cuando el comportamiento del repositorio sea correcto pero falte orientación, sea poco clara, esté duplicada, obsoleta o sea difícil de descubrir. Proponga la actualización más pequeña de `AGENTS.md` o el documento de tema propietario.
- **Implementación autorizada por separado:** uso cuando el hallazgo requiera cambiar el comportamiento del tiempo de ejecución de MCP, perfiles, esquemas, registro del servidor, `.ai/mcp/mcp.json`, herramientas u otra implementación. Regístrelo como seguimiento; no lo implemente como parte de una revisión de documentación a menos que esté explícitamente autorizado.
- **Sin cambios:** utilizar cuando la observación es especulativa, carece de evidencia o la convención existente sigue siendo la opción más segura y clara.

Cualquier seguimiento debe preservar la dirección de dependencia, los límites de mutación explícitos, la portabilidad, la compatibilidad con versiones anteriores, los privilegios mínimos y las operaciones limitadas. Vincule la evidencia e identifique al propietario, la fuente de verdad afectada y la siguiente acción segura más pequeña.

## Formato de liquidación

Utilice este formato compacto en la entrega final cuando se requiera una revisión escrita:

```markdown
### Session self-review
- Outcome: <expected and observed result>
- Evidence: <checks performed and results>
- Assumptions or uncertainty: <confirmed, disproved, or unresolved items>
- Guidance and MCP findings: <what helped or caused friction>
- Follow-up: <documentation, separately authorized implementation, or no change; include evidence>
```

Política relacionada: [rúbrica de calidad](quality-rubric.md), [seguridad y validación del repositorio](repository-safety-and-validation.md) y la raíz [AGENTS.md](../../../../AGENTS.md).
