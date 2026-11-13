# Rúbrica de calidad del trabajo del agente

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> docs/agent-guidance/quality-rubric.md: [docs/agent-guidance/quality-rubric.md](../../../agent-guidance/quality-rubric.md)
> Idioma: Español (es)

Utilice esta rúbrica antes de la implementación para elegir un enfoque y durante la revisión para evaluar el resultado. Aplicar todas las dimensiones que se ajusten a la tarea; un cambio únicamente de documentación aún debe ser simple, mantenible, legible e higiénico. Registre evidencia concreta de compensaciones materiales en lugar de tratar la rúbrica como una puntuación subjetiva.

## El cambio seguro más pequeño

- Indique el resultado solicitado y el cambio más pequeño que pueda satisfacerlo.
- Preferir patrones de repositorio, paquetes, herramientas, perfiles y documentación existentes a nuevas abstracciones.
- Mantenga fuera de la tarea la limpieza no relacionada, el rediseño especulativo y los cambios de tiempo de ejecución de MCP no aprobados.
- Ampliar el alcance sólo cuando la evidencia demuestre que el enfoque más pequeño no puede preservar la corrección, la seguridad o la validación requerida.

## Siete dimensiones

### Sencillez

- ¿La solución utiliza la menor cantidad de archivos, partes móviles, dependencias, transiciones de estado y llamadas a herramientas que satisfagan el requisito?
- ¿Reutiliza un componente, utilidad, token, traducción, flujo de trabajo o capacidad MCP existente en lugar de duplicar uno?
- ¿Se han eliminado las abstracciones especulativas, las herramientas MCP duplicadas y los cambios de configuración innecesarios?

### Complejidad

- Identificar nuevas dependencias, estado, flujo de control, bordes entre paquetes, superficie de perfil/herramienta, pasos operativos y modos de falla.
- Explicar por qué se requiere cada fuente inevitable de complejidad y por qué una alternativa más simple es insuficiente.
- Mantenga la complejidad local en el paquete propietario o documento temático y evite difundir políticas entre fuentes duplicadas.

### Fiabilidad

- Definir el comportamiento esperado observable y la evidencia que lo demostrará.
- Prefiere comportamiento determinista, operaciones limitadas, manejo explícito de fallas y respaldos seguros.
- Validar los caminos que importan, incluidos los casos negativos y los límites de integración; no trate un dispositivo parcial, un diagnóstico de fuente o una unidad aislada como prueba del comportamiento de un extremo a otro.
- Informar fracasos, incertidumbres y suposiciones no verificadas en lugar de inferir silenciosamente el éxito.

### Mantenibilidad

- Siga las convenciones del repositorio en cuanto a estructura, denominación, dependencias, pruebas, documentación y propiedad.
- Mantener las responsabilidades locales y entregar a cada regla una documentación canónica en casa.
- Documentar decisiones duraderas y limitaciones no obvias donde un futuro agente las encontrará.
- Evite enlaces obsoletos, inventarios duplicados, implementaciones paralelas y redacción que puedan desviarse de la fuente de la verdad.

### Seguridad

- Preservar privilegios mínimos, límites de ruta y raíz del repositorio, ejecución sin shell, aprobación explícita de mutaciones e higiene secreta.
- Defenderse contra la inyección, utilizar criptografía aprobada y prácticas de dependencia, y preservar la dirección de la dependencia.
- No debilite los análisis de seguridad existentes ni reemplace la inspección limitada/de solo lectura con un acceso más amplio para mayor comodidad.
- Para los cambios aplicables, ejecute las comprobaciones de seguridad de desarrollador-MCP pertinentes: `security_scan_secrets`, `security_analyze_code`, `security_audit_dependencies`, `security_audit_supply_chain`, `security_collect_compliance_evidence` y `security_audit_compliance`.

### Higiene

- Mantenga la diferencia enfocada y preserve el formato del repositorio, los nombres y las convenciones de flujo de trabajo.
- Elimine los artefactos temporales creados durante la tarea sin eliminar archivos preexistentes o administrados por sesión.
- Actualice la documentación y los enlaces afectados y verifique que no se hayan incluido archivos generados, locales, secretos o no relacionados.
- Informar la validación exacta realizada y cualquier verificación que no se haya podido ejecutar.

### Legibilidad y comprensión

- Utilice una jerarquía de títulos clara, secciones breves, terminología coherente y oraciones directas para que el agente previsto pueda leer la guía rápidamente.
- Minimizar la carga cognitiva: presentar requisitos previos antes de las acciones, mantener juntas las reglas relacionadas, identificar el trabajo obligatorio frente al opcional y evitar referencias cruzadas inexplicables.
- Explicar las restricciones no obvias, la propiedad, la precedencia, los límites de seguridad y el motivo de un requisito de validación inusual.
- Verifique que los enlaces, ejemplos, nombres y descripciones de resultados sean comprensibles sin un contexto de sesión oculto.
- Realizar una prueba de comprensión independiente: ¿podría otro agente seguir la guía y elegir la siguiente acción correcta únicamente a partir del documento?

## Revisar registro

Para una tarea no trivial, resuma los hallazgos de la rúbrica en la revisión o entrega final. Mencione el enfoque seguro más pequeño, la complejidad del material, la evidencia de confiabilidad, los controles de seguridad e higiene y cualquier problema de legibilidad que deba convertirse en un trabajo de seguimiento autorizado por separado.

Política relacionada: [Seguridad y validación del repositorio](repository-safety-and-validation.md) y [Autorevisión de sesión](session-self-review.md).
