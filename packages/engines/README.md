# @syntaxerror/engines

Motores de las consolas de trabajo: SQL (alasql), planilla (HyperFormula en español) y Python (Pyodide en un web worker).

## Contrato común (`src/consola.ts`)

Toda consola hace cuatro cosas:

1. **Ejecutar:** devuelve `{ ok: true, ... }` con su resultado, y `avisos` si hay algo que probablemente está mal, o `{ ok: false, error }`.
2. **Validar:** compara con lo esperado y devuelve `ResultadoTarea` (`{ aprobada, diagnostico }`).
3. **Mostrar el resultado:** filas, celdas, tablas de pandas o salida de texto.
4. **Explicar el error:** `ErrorExplicado` = `{ mensaje, sugerencia, linea, original }`, en español y sin perder el mensaje original.

Reglas:
- Una explicación explica el error, nunca la solución de la tarea.
- Los "¿Quisiste decir…?" salen de `sugerirNombre`, con los nombres del caso (tablas, columnas, archivos o variables).
- Los avisos nunca bloquean la ejecución.

## Agregar una consola (rutas futuras)

Una ruta nueva, como Ciberseguridad (registros) o Cloud/DevOps (terminal), agrega su consola sin rediseñar la plataforma:

1. Crea `src/<consola>.ts` con la función de ejecutar, que devuelve el resultado o un `ErrorExplicado`, y la de validar, que devuelve `ResultadoTarea`.
2. Crea `src/<consola>-errores.ts` con su traductor de errores. Sus pruebas usan los mensajes reales del motor: sondéalos antes de escribirlas.
3. Exporta ambos en `package.json`.
4. En la web:
   - agrega el bloque de contenido en `packages/content/src/esquemas.ts`;
   - crea su componente en `apps/web/src/components/mision/`, usando `PanelTarea`, `ExplicacionError`/`AvisosConsola` y, si se escribe código, `EditorConsola` con un `completar` propio.
