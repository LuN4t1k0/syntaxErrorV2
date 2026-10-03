# Fase 6g: Pruebas e2e que esperan el reporte correcto. Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quitar una falla al azar de las pruebas e2e: después de un intento fallido, la prueba esperaba "el siguiente reporte" y podía tomar el del intento fallido en vez del de la aprobación.

**Architecture:**
- **Lo que pasó** (`clases.spec.ts:20`, una de cada varias corridas):
  1. La prueba valida una consulta incorrecta. El mensaje de error aparece en el navegador antes de que termine el reporte de ese intento al servidor.
  2. Valida la consulta correcta y espera "la siguiente respuesta de `/api/progreso`": a veces toma la del intento fallido.
  3. Sigue de inmediato a otra página y el navegador cancela el reporte de la aprobación (`ERR_ABORTED`).
  4. La plataforma hace lo correcto: guarda la aprobación pendiente y la envía en la página siguiente (`/api/progreso/sync`). Pero la prueba aprueba la lección 2 por la API antes de que ese envío termine, y el servidor responde 409 (`mision_bloqueada`).
- **El arreglo:** un helper `reporteDeTarea(page, aprobada?)` en `e2e/tests/fixtures.ts` espera la respuesta del reporte cuyo cuerpo tiene ese `aprobada`. Reemplaza las 19 esperas que repetían la misma condición. La espera de `/api/progreso/sync` en `misiones.spec.ts` no cambia.
- **No es una falla de la plataforma** ni tiene relación con la 6f: los e2e corren contra las imágenes de producción.

**Tech Stack:** Playwright 1.55.

**Spec:** traza de la falla del 2026-10-02 en la revisión de la 6f.

## Global Constraints

- Commits en español, con el trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Una espera marcada con el resultado equivocado** (por ejemplo, `true` donde la tarea falla) deja la prueba esperando hasta el timeout: se nota al correrla, no pasa en silencio.
2. **Las esperas sin `aprobada`** (`validarYEsperar` y el quiz de `clases.spec.ts`) siguen como antes: ahí cada clic espera su propio reporte antes del siguiente.

---

### Task 1: El helper y las esperas

**Files:**
- Modify: `e2e/tests/fixtures.ts` y 12 specs (tabla abajo)

**Interfaces:**
- Produces: `reporteDeTarea(page: Page, aprobada?: boolean): Promise<Response>`, exportado desde `./fixtures`.

- [ ] **Step 1: El helper**

Al final de `e2e/tests/fixtures.ts`, después de `export { expect, type Page } from "@playwright/test";`, agrega:
```ts
// La respuesta del servidor al reporte de una tarea. Con `aprobada`, solo la de ese resultado: el mensaje de un
// intento fallido aparece antes de que su reporte termine, así que esperar "el siguiente reporte" después del clic
// que aprueba puede tomar el del intento anterior, y la prueba sigue sin que la aprobación haya llegado.
export function reporteDeTarea(page: Page, aprobada?: boolean) {
  return page.waitForResponse(
    (respuesta) => respuesta.url().endsWith("/api/progreso") && respuesta.request().method() === "POST" && (aprobada === undefined || respuesta.request().postDataJSON()?.aprobada === aprobada)
  );
}
```

- [ ] **Step 2: Reemplazar las esperas**

En cada spec de la tabla:
- reemplaza `page.waitForResponse((respuesta) => respuesta.url().endsWith("/api/progreso") && respuesta.request().method() === "POST")` por lo que indica la columna "Queda";
- en su import de `./fixtures`, agrega `reporteDeTarea` (`import { expect, reporteDeTarea, test } from "./fixtures";`, con `type Page` al final donde ya estaba).

| Archivo | Línea | Variable | Queda |
|---|---|---|---|
| `e2e/tests/clases.spec.ts` | 35 | `aprobada` | `reporteDeTarea(page, true)` |
| `e2e/tests/clases.spec.ts` | 67 | `aprobada` | `reporteDeTarea(page, true)` |
| `e2e/tests/clases.spec.ts` | 75 | `marcada` | `reporteDeTarea(page, true)` |
| `e2e/tests/clases.spec.ts` | 96 | `fallida` | `reporteDeTarea(page, false)` |
| `e2e/tests/clases.spec.ts` | 102 | `aprobada` | `reporteDeTarea(page, true)` |
| `e2e/tests/clases.spec.ts` | 127 | `marcada` | `reporteDeTarea(page, true)` |
| `e2e/tests/clases.spec.ts` | 149 | `reportado` | `reporteDeTarea(page)` |
| `e2e/tests/clinica.spec.ts` | 27 | `aprobada` | `reporteDeTarea(page, true)` |
| `e2e/tests/comunidad.spec.ts` | 31 | `reportado` | `reporteDeTarea(page, true)` |
| `e2e/tests/consolas.spec.ts` | 20 | `reportado` | `reporteDeTarea(page)` |
| `e2e/tests/despachos.spec.ts` | 14 | `reportado` | `reporteDeTarea(page)` |
| `e2e/tests/minimarkets.spec.ts` | 38 | `primera` | `reporteDeTarea(page, true)` |
| `e2e/tests/misiones.spec.ts` | 21 | `reportado` | `reporteDeTarea(page)` |
| `e2e/tests/pewen.spec.ts` | 33 | `primera` | `reporteDeTarea(page, true)` |
| `e2e/tests/plataforma.spec.ts` | 22 | `reportado` | `reporteDeTarea(page, true)` |
| `e2e/tests/proyecto-final.spec.ts` | 27 | `propuesta` | `reporteDeTarea(page, true)` |
| `e2e/tests/proyecto-final.spec.ts` | 42 | `leida` | `reporteDeTarea(page, true)` |
| `e2e/tests/recorrido.spec.ts` | 9 | `reportado` | `reporteDeTarea(page)` |
| `e2e/tests/tutor.spec.ts` | 24 | `reportado` | `reporteDeTarea(page, false)` |

Comprueba que no quedó ninguna:

Run: `grep -n 'endsWith("/api/progreso") &&' e2e/tests/*.spec.ts`
Expected: sin resultados.

- [ ] **Step 3: Correr**

Run: `npm run test:e2e -- tests/clases.spec.ts:20 --repeat-each 15`
Expected: `15 passed`.

Run: `npm run test:e2e`
Expected: `45 passed`, tres corridas seguidas.

- [ ] **Step 4: Commit**

```bash
git add e2e/tests
git commit -m "test(e2e): esperar el reporte de la aprobacion y no el del intento fallido anterior

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
