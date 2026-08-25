# Matriz de compatibilidad de WebLua Lua 5.5.1

Traducción asistida por máquina a partir de la fuente canónica en inglés. Revisar manualmente cuando sea necesario. Los nombres de paquetes, comandos, rutas e identificadores técnicos no se modifican.

> docs/web-lua-compatibility.md: [docs/web-lua-compatibility.md](../../web-lua-compatibility.md)
> Idioma: Español (es)

Este informe es intencionalmente conservador. `matched` significa que el comportamiento está cubierto por un dispositivo de nivel invitado y tiene un resultado esperado determinista; `capability-gated` significa que los efectos del host requieren una política explícita; `unresolved` significa que se realiza un seguimiento del comportamiento, pero no se debe tratar como aprobado.

| Área | Comportamiento | Estado | Evidencia | Notas |
| ----------------------- | ----------------------------------------------------------------------------- | ---------------- | -------------------------------------------- | -------------------------------------------------------------------------------------- |
| sintaxis léxica | Espacios en blanco, comentarios, palabras clave, literales enteros y operadores | emparejado | `packages/web-lua/src/differential.spec.ts` | Sólo se reclama el subconjunto escalar implementado.                                         |
| expresiones escalares | Aritmética de enteros, menos unario, agrupación, precedencia y comparaciones | emparejado | `packages/web-lua/src/differential.spec.ts` | Los resultados utilizan el ABI escalar invitado actual.                                              |
| locales y control de flujo | Asignación local, reasignación, `if`/`else`, `while` y devoluciones | emparejado | `packages/web-lua/src/differential.spec.ts` | Las capacidades locales y de pila de los invitados siguen siendo límites explícitos.                               |
| funciones nombradas | Definiciones con nombre, parámetros, llamadas y retornos escalares | emparejado | `packages/web-lua/src/differential.spec.ts` | Los cierres, valores ascendentes, varargs, llamadas de cola y devoluciones múltiples permanecen fuera de esta fila. |
| errores y carga | Estados de sintaxis, tiempo de ejecución, división y prefijos binarios con formato incorrecto | emparejado | `packages/web-lua/src/utils/web-lua.spec.ts` | Los estados se comparan sin interpretación Lua del lado del host.                            |
| bibliotecas orientadas al host | E/S, reloj, aleatoriedad, sistema operativo, carga de paquetes y efectos de depuración | dependiente de la capacidad | `packages/web-lua/src/utils/web-lua.spec.ts` | Las capacidades se niegan de forma predeterminada; Las implementaciones de la biblioteca están incompletas.              |
| valores y tablas | Cadenas, flotantes, tablas, datos de usuario, identidad, iteración y metamétodos | sin resolver | `packages/web-lua/src/utils/web-lua.spec.ts` | El límite actual expone valores escalares y una base de tabla de una entrada.           |
| cierres y corrutinas | Valores ascendentes, `yield`/`resume`, llamadas protegidas y errores de rutina anidados | sin resolver | `packages/web-lua/src/utils/web-lua.spec.ts` | `resume` actualmente vuelve a ejecutar un prototipo y no se considera semántica de rutina.  |
| bibliotecas estándar | Base, corrutina, tabla, cadena, UTF-8, matemáticas, E/S, sistema operativo, depuración y paquete/carga | sin resolver | Sin accesorio diferencial de biblioteca estándar | Ningún comportamiento de la biblioteca se trata silenciosamente como aprobado.                                    |

La fuente generada de este informe es la matriz escrita en `packages/web-lua/src/compatibility.ts`; sus pruebas requieren una clasificación explícita y una entrada de evidencia para cada fila.
